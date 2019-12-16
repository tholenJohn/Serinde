var ShoppingCart = require("../models/ShoppingCart.js")

var cart = new ShoppingCart

beforeEach(function(){
    cart = new ShoppingCart
})

describe("Serialize", function(){
    it("The function should return the items in the cart as a JSON object", function(){
        var emptyArray = []

        expect(cart.serialize().toString() == emptyArray.toString()).toBe(true)
        cart.add({
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        })

        cart.add({
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        })
        expect(cart.serialize().toString() == emptyArray.toString()).toBe(false)  
    })
})

describe("Add", function(){
    it("The function should add the item to the cart", function(){
        var emptyArray = []
        cart.add({
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        })
        expect(cart.serialize().toString() == emptyArray.toString()).toBe(false)  
    })
})

describe("Remove", function(){
    it("The function should remove an item from the cart", function(){
        var emptyArray = []

        var product = {
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        }
        var product2 = {
            id : "1234",
            title: "1234",
            price: "1234",
            image: "1234"
        }

        cart.remove(product)
        expect(cart.serialize().toString() == emptyArray.toString()).toBe(true)  

        cart.add(product)
        cart.remove(product2)
        expect(cart.serialize().toString() == emptyArray.toString()).toBe(false) 

        cart.remove(product)
        expect(cart.serialize().toString() == emptyArray.toString()).toBe(true) 
    })
})

describe("Deserialize", function(){
    it("This function returns a ShoppingCart object from a JSON object", function(){
        
        var items = []

        var cart2 = ShoppingCart.deserialize(items)
        
        expect(cart.serialize().toString() == cart2.serialize().toString()).toBe(true)
        
        items.push({
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        })

        cart3 = ShoppingCart.deserialize(items)

        cart.add({
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        })

        expect(cart.serialize().toString() == cart3.serialize().toString()).toBe(true)
        
    })
})

describe("GetQty", function(){
    it("The function should return the number of a specific type of item given an ID", function(){

        expect(cart.getQty("123") == 0).toBe(true)

        cart.add({
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        }) 

        expect(cart.getQty("123") == 1).toBe(true)  

        var product = {
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        }

        cart.remove(product)
        expect(cart.getQty("123") == 0).toBe(true)  
    })
})

describe("GetTotal", function(){
    it("The function should the total price of items in the cart", function(){
        
        expect(cart.getTotal() == 0).toBe(true)

        var product = {
            id : "123",
            title: "123",
            price: "123",
            image: "123"
        }
        cart.add(product) 

        expect(cart.getTotal() == 123).toBe(true)  

        cart.remove(product)
        expect(cart.getTotal() == 0).toBe(true)

        cart.add(product) 
        cart.add(product) 
        cart.add(product) 
        cart.add(product) 
        cart.add(product) 
        expect(cart.getTotal() == 123*5).toBe(true)
    })
})