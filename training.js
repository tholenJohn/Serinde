const brain = require('brain.js')



//dummy data of items bought and their prices
let arr =  {
    'mensShoes': 1,
    'womensShoes': 1,
    'electronics': 1,
    'fashion': 1,
    'cosmetics': 1
}

// Inputs:
var items = [
    {mensShoes: 1},
    {womensShoes: 1},
    {electronics: 1},
    {fashion: 1},
    {cosmetics: 1},
    {movies: 1}
]

// Outputs:
var range = [
    {high: 1},
    {high: 1},
    {low: 1},
    {low: 1},
    {low: 1},
    {medium: 1},
]


//training data: 
const trainingData = []


/* 
    Function to get high/mid/low string back: Takes in the category and outputs the likely 
    range of price that person usually goes for
*/
function getRange(name) {
    //push new item mimicing new purchase 
    var key = name
    var keyObj = {[key]: 1}
    //items.push(keyObj)


    //train data
    for (let i = 0; i < items.length; i++) {
        trainingData.push({
            input: items[i],
            output: range[i]
        })
    }


    //set up neural net
    const net = new brain.NeuralNetwork({ hiddenLayers: [3]});


    //train data
    const stats = net.train(trainingData)
    //console.log(stats)
    
    
    // Store all ranges of a specific category in "allRange" object
    var allRange = net.run({
        keyObj
    })
    console.log(allRange)

    
    // Store the key with the maximum value in "answer"
    var answer = Object.keys(allRange).reduce((a, b) => allRange[a] > allRange[b] ? a : b)
    console.log(answer)

    return answer

}  // end of getRange function


getRange('books')  //outputs low because this person usually buys from low range

