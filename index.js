const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const pa = require('path');
const nodemailer = require('nodemailer');
const session  = require ('express-session')


// All npm imports
const express = require('express')
var admin = require('firebase-admin')
const firebase = require('firebase')
const app = express()

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

//All local imports
app.set('view engine', 'handlebars'); 
app.engine('handlebars', exphbs());


app.set('view engine', 'ejs');
app.set('views','./ejsviews');

app.use('/public', express.static(pa.join(__dirname +'/public')));

 app.use(bodyParser.urlencoded({ extended: false }));
 app.use(bodyParser.json());

// app.use(express.urlencoded( {extended:false}));
// PORT
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
})

app.get('/login', (req,res)=>{
  res.render("login")
})
app.post('/login', (req, res) => {
  const email = req.body.email
  const password = req.body.password
  firebase.auth().signInWithEmailAndPassword(email, password)
      .then(result => {
          res.redirect('/') // to homepage
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


app.get('/', (_req,res) => {
  res.render('storefront',{nav: 'storefront'});

  

app.get('/contact', (req, res) => {
    res.render('main.handlebars',{nav: 'contact'});
  });
  //==========================================================
  //nodemailer configuration starts..
  //==========================================================
  app.post('/send', (req, res) => {
    const output = `
      <p>You have a new contact request</p>
      <h3>Contact Details</h3>
      <ul>  
        <li>Name: ${req.body.name}</li>
        <li>Company: ${req.body.company}</li>
        <li>Email: ${req.body.email}</li>
        <li>Phone: ${req.body.phone}</li>
      </ul>
      <h3>Message</h3>
      <p>${req.body.message}</p>
    `;
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      
      //port: 537 ,
      //secure: false, // true for 465, false for other ports
      auth: {
          user: 'sumiayi@gmail.com', // generated ethereal user
          pass: '987654321Ab'  // generated ethereal password
      },
      // tls:{
      //   rejectUnauthorized:false
      // }
    });
  
    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Nodemailer Contact" <sumiayi@gmail.com>', // sender address
        to: 'priankasumia@yahoo.com', // list of receivers
        subject: 'Node Contact Request', // Subject line
        text: 'Hello world?', // plain text body
        html: output // html body
    };
  
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);   
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  
        res.render('main.handlebars', {msg:'Email has been sent'});
    });
    });
    //==========================================================
    //NODEMAILER CONFIG. ENDS
    //==========================================================
  })
