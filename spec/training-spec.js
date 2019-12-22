var Training = require("../training.js")

var train = new Training

beforeEach(function(){
    train = new Training
})

describe('addItems', function(){
    it("This function adds categories to items array", function(){
        expect(train.items.length == 0).toBe(true)
        train.addItems("Computers")
        train.addItems("Fashion")
        expect(train.items.length == 2).toBe(true)
        train.addItems("Cell Phones")
        expect(train.items.length == 3).toBe(true)
    })
})

describe('addRange', function(){
    it("This function adds ranges to range array", function(){
        expect(train.range.length == 0).toBe(true)
        train.addRange(1,0,0)
        expect(train.range.length == 1).toBe(true)
        train.range.pop()
        expect(train.range.length == 0).toBe(true)
        train.addRange(1,0,0)
        train.addRange(1,1,0)
        train.addRange(1,0,1)
        train.addRange(1,0,1)
        train.addRange(1,1,1)
        train.addRange(0,0,0)
        expect(train.range.length == 6).toBe(true)
    })
})

describe('getRange', function(){
    it("This function takes in the category and outputs the likely range of price", function(){
        train.addItems("Computers")
        train.addRange(0,1,0)
        train.addItems("Computers")
        train.addRange(0,1,0)
        expect(train.getRange("Computers")=='low').toBe(true)
        train.addItems("Computers")
        train.addRange(0,0,1)
        train.addItems("Computers")
        train.addRange(0,0,1)
        train.addItems("Computers")
        train.addRange(0,0,1)
        train.addItems("Computers")
        train.addRange(0,0,1)
        train.addItems("Computers")
        train.addRange(1,0,0)
        expect(train.getRange("Computers")=='mid').toBe(true)
        train.addItems("Computers")
        train.addRange(1,0,0)
        train.addItems("Computers")
        train.addRange(1,0,0)
        train.addItems("Computers")
        train.addRange(1,0,0)
        train.addItems("Computers")
        train.addRange(1,0,0)
        train.addItems("Computers")
        train.addRange(1,0,0)
        train.addItems("Computers")
        train.addRange(1,0,0)
        expect(train.getRange("Computers")=='high').toBe(true)
    })
})