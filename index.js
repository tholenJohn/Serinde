// All npm imports
const express = require('express')
const app = express()

// All local imports


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







