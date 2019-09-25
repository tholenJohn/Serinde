"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const load_balancer_1 = require("./load-balancer");
const channel_1 = require("./channel");
const picker_1 = require("./picker");
const TYPE_NAME = 'pick_first';
/**
 * Delay after starting a connection on a subchannel before starting a
 * connection on the next subchannel in the list, for Happy Eyeballs algorithm.
 */
const CONNECTION_DELAY_INTERVAL_MS = 250;
/**
 * Picker for a `PickFirstLoadBalancer` in the READY state. Always returns the
 * picked subchannel.
 */
class PickFirstPicker {
    constructor(subchannel) {
        this.subchannel = subchannel;
    }
    pick(pickArgs) {
        return {
            pickResultType: picker_1.PickResultType.COMPLETE,
            subchannel: this.subchannel,
            status: null,
        };
    }
}
class PickFirstLoadBalancer {
    /**
     * Load balancer that attempts to connect to each backend in the address list
     * in order, and picks the first one that connects, using it for every
     * request.
     * @param channelControlHelper `ChannelControlHelper` instance provided by
     *     this load balancer's owner.
     */
    constructor(channelControlHelper) {
        this.channelControlHelper = channelControlHelper;
        /**
         * The list of backend addresses most recently passed to `updateAddressList`.
         */
        this.latestAddressList = [];
        /**
         * The list of subchannels this load balancer is currently attempting to
         * connect to.
         */
        this.subchannels = [];
        /**
         * The current connectivity state of the load balancer.
         */
        this.currentState = channel_1.ConnectivityState.IDLE;
        /**
         * The index within the `subchannels` array of the subchannel with the most
         * recently started connection attempt.
         */
        this.currentSubchannelIndex = 0;
        /**
         * The number of subchannels in the `subchannels` list currently in the
         * CONNECTING state. Used to determine the overall load balancer state.
         */
        this.subchannelConnectingCount = 0;
        /**
         * The currently picked subchannel used for making calls. Populated if
         * and only if the load balancer's current state is READY. In that case,
         * the subchannel's current state is also READY.
         */
        this.currentPick = null;
        this.triedAllSubchannels = false;
        this.updateState(channel_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this));
        this.subchannelStateListener = (subchannel, previousState, newState) => {
            if (previousState === channel_1.ConnectivityState.CONNECTING) {
                this.subchannelConnectingCount -= 1;
            }
            if (newState === channel_1.ConnectivityState.CONNECTING) {
                this.subchannelConnectingCount += 1;
            }
            /* If the subchannel we most recently attempted to start connecting
             * to goes into TRANSIENT_FAILURE, immediately try to start
             * connecting to the next one instead of waiting for the connection
             * delay timer. */
            if (subchannel === this.subchannels[this.currentSubchannelIndex] &&
                newState === channel_1.ConnectivityState.TRANSIENT_FAILURE) {
                this.startNextSubchannelConnecting();
            }
            if (newState === channel_1.ConnectivityState.READY) {
                this.pickSubchannel(subchannel);
                return;
            }
            else {
                if (this.currentPick === null) {
                    if (this.triedAllSubchannels) {
                        const newLBState = this.subchannelConnectingCount > 0
                            ? channel_1.ConnectivityState.CONNECTING
                            : channel_1.ConnectivityState.TRANSIENT_FAILURE;
                        if (newLBState !== this.currentState) {
                            if (newLBState === channel_1.ConnectivityState.TRANSIENT_FAILURE) {
                                this.updateState(newLBState, new picker_1.UnavailablePicker());
                            }
                            else {
                                this.updateState(newLBState, new picker_1.QueuePicker(this));
                            }
                        }
                    }
                    else {
                        this.updateState(channel_1.ConnectivityState.CONNECTING, new picker_1.QueuePicker(this));
                    }
                }
            }
        };
        this.pickedSubchannelStateListener = (subchannel, previousState, newState) => {
            if (newState !== channel_1.ConnectivityState.READY) {
                subchannel.unref();
                subchannel.removeConnectivityStateListener(this.pickedSubchannelStateListener);
                if (this.subchannels.length > 0) {
                    const newLBState = this.subchannelConnectingCount > 0
                        ? channel_1.ConnectivityState.CONNECTING
                        : channel_1.ConnectivityState.TRANSIENT_FAILURE;
                    if (newLBState === channel_1.ConnectivityState.TRANSIENT_FAILURE) {
                        this.updateState(newLBState, new picker_1.UnavailablePicker());
                    }
                    else {
                        this.updateState(newLBState, new picker_1.QueuePicker(this));
                    }
                }
                else {
                    this.connectToAddressList();
                    this.channelControlHelper.requestReresolution();
                }
            }
        };
        this.connectionDelayTimeout = setTimeout(() => { }, 0);
        clearTimeout(this.connectionDelayTimeout);
    }
    startNextSubchannelConnecting() {
        if (this.triedAllSubchannels) {
            return;
        }
        for (const [index, subchannel] of this.subchannels.entries()) {
            if (index > this.currentSubchannelIndex) {
                const subchannelState = subchannel.getConnectivityState();
                if (subchannelState === channel_1.ConnectivityState.IDLE ||
                    subchannelState === channel_1.ConnectivityState.CONNECTING) {
                    this.startConnecting(index);
                    return;
                }
            }
        }
        this.triedAllSubchannels = true;
    }
    /**
     * Have a single subchannel in the `subchannels` list start connecting.
     * @param subchannelIndex The index into the `subchannels` list.
     */
    startConnecting(subchannelIndex) {
        clearTimeout(this.connectionDelayTimeout);
        this.currentSubchannelIndex = subchannelIndex;
        if (this.subchannels[subchannelIndex].getConnectivityState() ===
            channel_1.ConnectivityState.IDLE) {
            process.nextTick(() => {
                this.subchannels[subchannelIndex].startConnecting();
            });
        }
        this.connectionDelayTimeout = setTimeout(() => {
            this.startNextSubchannelConnecting();
        }, CONNECTION_DELAY_INTERVAL_MS);
    }
    pickSubchannel(subchannel) {
        if (this.currentPick !== null) {
            this.currentPick.unref();
            this.currentPick.removeConnectivityStateListener(this.pickedSubchannelStateListener);
        }
        this.currentPick = subchannel;
        this.updateState(channel_1.ConnectivityState.READY, new PickFirstPicker(subchannel));
        subchannel.addConnectivityStateListener(this.pickedSubchannelStateListener);
        subchannel.ref();
        this.resetSubchannelList();
        clearTimeout(this.connectionDelayTimeout);
    }
    updateState(newState, picker) {
        this.currentState = newState;
        this.channelControlHelper.updateState(newState, picker);
    }
    resetSubchannelList() {
        for (const subchannel of this.subchannels) {
            subchannel.removeConnectivityStateListener(this.subchannelStateListener);
            subchannel.unref();
        }
        this.currentSubchannelIndex = 0;
        this.subchannelConnectingCount = 0;
        this.subchannels = [];
        this.triedAllSubchannels = false;
    }
    /**
     * Start connecting to the address list most recently passed to
     * `updateAddressList`.
     */
    connectToAddressList() {
        this.resetSubchannelList();
        this.subchannels = this.latestAddressList.map(address => this.channelControlHelper.createSubchannel(address, {}));
        for (const subchannel of this.subchannels) {
            subchannel.ref();
        }
        for (const subchannel of this.subchannels) {
            subchannel.addConnectivityStateListener(this.subchannelStateListener);
            if (subchannel.getConnectivityState() === channel_1.ConnectivityState.READY) {
                this.pickSubchannel(subchannel);
                this.updateState(channel_1.ConnectivityState.READY, new PickFirstPicker(subchannel));
                this.resetSubchannelList();
                return;
            }
        }
        for (const [index, subchannel] of this.subchannels.entries()) {
            const subchannelState = subchannel.getConnectivityState();
            if (subchannelState === channel_1.ConnectivityState.IDLE ||
                subchannelState === channel_1.ConnectivityState.CONNECTING) {
                this.startConnecting(index);
                this.updateState(channel_1.ConnectivityState.CONNECTING, new picker_1.QueuePicker(this));
                return;
            }
        }
        // If the code reaches this point, every subchannel must be in TRANSIENT_FAILURE
        this.updateState(channel_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker());
    }
    updateAddressList(addressList, lbConfig) {
        // lbConfig has no useful information for pick first load balancing
        this.latestAddressList = addressList;
        this.connectToAddressList();
    }
    exitIdle() {
        for (const subchannel of this.subchannels) {
            subchannel.startConnecting();
        }
        if (this.currentState === channel_1.ConnectivityState.IDLE) {
            if (this.latestAddressList.length > 0) {
                this.connectToAddressList();
            }
        }
    }
    resetBackoff() {
        /* The pick first load balancer does not have a connection backoff, so this
         * does nothing */
    }
    destroy() {
        this.resetSubchannelList();
        if (this.currentPick !== null) {
            this.currentPick.unref();
            this.currentPick.removeConnectivityStateListener(this.pickedSubchannelStateListener);
        }
    }
    getTypeName() {
        return TYPE_NAME;
    }
    replaceChannelControlHelper(channelControlHelper) {
        this.channelControlHelper = channelControlHelper;
    }
}
exports.PickFirstLoadBalancer = PickFirstLoadBalancer;
function setup() {
    load_balancer_1.registerLoadBalancerType(TYPE_NAME, PickFirstLoadBalancer);
}
exports.setup = setup;
//# sourceMappingURL=load-balancer-pick-first.js.map