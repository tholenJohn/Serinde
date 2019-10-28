class ShoppingCart {
    constructor() {
        this.items = [];
    }

    add(product) {
        let found = false;
        for (const item of this.items) {
            if (item.product.id == product.id) {
                found = true;
                ++item.qty;
            }
        }

        if (!found) {
            this.items.push({ product: product, qty: 1 });
        }

    }

    remove(product) {
        for (const item of this.items) {
            if (item.product.id == product.id) {
                var index = this.items.indexOf(item);
                this.items.splice(index, 1);
            }
        }
    }

    serialize() {
        return this.items;
    }

    static deserialize(items) {
        const sc = new ShoppingCart();
        sc.items = items;
        return sc;
    }

    getQty(id) {
        for (const item of this.items) {
            if (item.product.id == id) {
                return item.qty;
            }
        }
        return 0;
    }

    getTotal() {
        let sum = 0;
        for (const item of this.items) {
            sum += item.qty * item.product.price;
        }
        return sum;
    }
}

module.exports = ShoppingCart;