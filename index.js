// All npm imports
const express = require('express')
var admin = require('firebase-admin')
const firebase = require('firebase')
const app = express()
app.use(express.urlencoded({ extended: false }))
app.set('view engine', 'ejs')
app.set('views', './views')
app.use('/public', express.static(__dirname + '/public'))

// Firebase initialization

const serviceAccount = require("./serinde-dae45-firebase-adminsdk-z0zyl-40de77fbd0.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://serinde-dae45.firebaseio.com"
  });
const db = admin.firestore();

const firebaseConfig = {
    apiKey: "AIzaSyDFSmXBXK2k_QUsWRu6NJrGhc7AcAEW5ZU",
    authDomain: "serinde-dae45.firebaseapp.com",
    databaseURL: "https://serinde-dae45.firebaseio.com",
    projectId: "serinde-dae45",
    storageBucket: "",
    messagingSenderId: "460955537577",
    appId: "1:460955537577:web:720cc9e7ba3436077319b8"
};
firebase.initializeApp(firebaseConfig);

// All local imports


// PORT
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
})


//----------------------------------
// HOMEPAGE GET ROUTE
//----------------------------------

// add auth middleware app.get('/', auth, (req, res) => {
app.get('/', (req, res) => {
    res.send('home page found')
})

app.get('/login', (req,res)=>{
    res.render("login")
})
app.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(result => {
            res.redirect('/')
        })
        .catch(error => {
            if (email == "") {
                res.render('errorPage', { message: "The email is blank!" })
            }
            else
                res.render('errorPage', { message: error.message })
        })
})

app.get('/signup', (req, res) => {
    res.render('signup')
})
app.post('/signup', (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const confirmpassword = req.body.confirmpassword
    if (password == confirmpassword) {
        //signup
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(result => {
                res.render('login')
            })
            .catch(error => {
                res.render('errorPage', { message: error.message })
            })
    }
    else {
        res.render('errorPage', { message: "The passwords do not match." })
    }
})


//----------------------------------
// FUNCTIONS
//----------------------------------

function auth(req, res, next) {
    if (firebase.auth().currentUser) {
        next()
    } else {
        res.render('errorPage', { message: "Unauthorized access! Login to access this page." })
    }
}

function adminAuth(req, res, next) {
    if (firebase.auth().currentUser && isAdmin(firebase.auth().currentUser.email)) {
        next()
    } else {
        res.render('errorPage', { message: "Unauthorized access! Privileged users only." })
    }
}

function isAdmin(email) {
    return email == "khoffmeister1@uco.edu" // || email == ""
}




