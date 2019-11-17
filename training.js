const brain = require('brain.js')

class Training {
    constructor() {
        this.items = []
        this.range = []
        //training data: 
        this.trainingData = []
    }

    // addItems function adds categories to items array
    addItems(categories) {
            this.items.push({
                [categories]: 1
            })
        //return this.items
    }


    // addRange function adds ranges to range array
    addRange(high, low, mid) {
            this.range.push({
                'high': high,
                'low': low,
                'mid': mid,
            })
        //return this.range
    }


    /* 
        Function to get high/mid/low string back: Takes in the category and outputs the likely 
        range of price that person usually goes for
    */

    getRange(name) {
        //push new item mimicing new purchase 
        var key = name
        var keyObj = {[key]: 1}


        //train data
        for (let i = 0; i < this.items.length; i++) {
            this.trainingData.push({
                input: this.items[i],
                output: this.range[i]
            })
        }


        //set up neural net
        const net = new brain.NeuralNetwork({ hiddenLayers: [3]});


        //train data
        const stats = net.train(this.trainingData)
        //console.log(stats)
        
        
        // Store all ranges of a specific category in "allRange" object
        var allRange = net.run({
            keyObj
        })
        //console.log(allRange)

        
        // Store the key with the maximum value in "answer"
        var answer = Object.keys(allRange).reduce((a, b) => allRange[a] > allRange[b] ? a : b)
        //console.log(answer)

        return answer

    }  // end of getRange function


} // class ends


//Test data
//var a = 'nafee'
//var b = 'naf'
 //var h = 0
 //var l = 1
 //var m = 0
//let t = new Training()
//console.log(t.addItems(a))
//console.log(t.addItems(b))
 //console.log(t.addRange(h, l, m))
// console.log(t.getRange('electronics'))


module.exports = Training


