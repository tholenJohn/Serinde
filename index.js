// All npm imports
const express = require('express')
const app = express()


// All local imports



// EJS views setup
app.set('view engine', 'ejs')
app.set('views', './views')
app.use('/public', express.static(__dirname + '/public'))


// PORT
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
})


//----------------------------------
// HOMEPAGE GET ROUTE
//----------------------------------
app.get('/', (req, res) => {
    res.send('home page found')
})



//----------------------------------
// SELLERPAGE GET ROUTE
//----------------------------------
app.get('/sellerprofile', (req, res) => {
    res.render('sellerprofile')
})




