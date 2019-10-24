// All npm imports
const express = require('express')
var admin = require('firebase-admin')
const firebase = require('firebase')
const app = express()
const bodyParser = require('body-parser')
const exphbs = require('express-handlebars')
const pa = require('path')
const nodemailer = require('nodemailer')
const session = require('express-session')
const fs = require('fs')
const utils = require('./utils.js')
var {Storage} = require('@google-cloud/storage')
const storage = new Storage({
    projectId: 'serinde-dae45',
    keyFilename: 'serinde-dae45-firebase-adminsdk-z0zyl-2c11c31be9.json'
});


// Firebase initialization
const serviceAccount = require("./serinde-dae45-firebase-adminsdk-z0zyl-2c11c31be9.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://serinde-dae45.firebaseio.com"
});
const db = admin.firestore();
const sellers = db.collection('sellers')
const users = db.collection('users')
const productsCollection = db.collection('products')

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
app.set('views', './ejsviews');
app.use('/public', express.static(pa.join(__dirname + '/public')));


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


//----------------------------------
// PORT ROUTE
//----------------------------------
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
})


//----------------------------------
// LOGIN PAGE GET ROUTE
//----------------------------------
app.get('/login', (req, res) => {
    res.render("login")
})

//----------------------------------
// CHANGE EMAIL PAGE GET ROUTE
//----------------------------------
app.get('/changeemail', auth, (req, res) => {
    res.render("changeemail")
})

//----------------------------------
// CHANGE EMAIL POST ROUTE
//----------------------------------
app.post('/changeemail', auth, (req, res) => {
    const oldEmail = firebase.auth().currentUser.email
    const userEmail = req.body.email
    if(oldEmail == userEmail){
        return res.redirect('/userprofile')
    }
    firebase.auth().currentUser.updateEmail(userEmail)
        .then(result => {
            // update user collection where it is their old email and update the entry
            users.doc(oldEmail).get().then(oldDoc => {
                if (oldDoc && oldDoc.exists) {
                    var data = oldDoc.data()
                    users.doc(userEmail).set({
                            Email: userEmail,
                            FirstName: data.FirstName,
                            LastName: data.FirstName,
                            Location: data.Location,
                            ProfilePicUrl: data.ProfilePicUrl
                        })
                        .then(result => {
                            users.doc(oldEmail).delete() // deleting old email document
                            users.doc(userEmail).get().then(doc => { // getting new information to send to profile
                                data = doc.data()
                                res.render('userprofile', { data })
                            })
                        }) // creating another doc with the same data

                }
            })

            sellers.get().then(sellersSnap=>{
                sellersSnap.forEach(seller =>{
                    if(seller.data().Email == oldEmail){
                        var newData = seller.data()
                        newData.Email = userEmail
                        sellers.doc(seller.id).set(newData) // updating seller email to new email change
                    }
                })
            })
        })
        .catch(error => {
            res.render('errorPage', { message: error.message })
        })

})

//----------------------------------
// LOGIN PAGE POST ROUTE
//----------------------------------
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
            } else
                res.render('errorPage', { message: error.message })
        })
})


//----------------------------------
// SIGNUP PAGE GET ROUTE
//----------------------------------
app.get('/signup', (req, res) => {
    res.render('signup')
})


//----------------------------------
// SIGNUP PAGE POST ROUTE
//----------------------------------
app.post('/signup', (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const confirmpassword = req.body.confirmpassword
    const first = req.body.first
    const last = req.body.last
    const location = req.body.location
    if (password == confirmpassword) {
        //signup
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(result => {
                //creating new document for the new user
                users.doc(email).set({ FirstName: first, LastName: last, Location: location, Email: email, ProfilePicUrl: "" })
                    .then(result => {
                        //signing in and redirecting to storefront with new account
                        firebase.auth().signInWithEmailAndPassword(email, password)
                            .then(result => {
                                res.redirect('/') // to homepage
                            })
                            .catch(error => {
                                res.render('errorPage', { message: error.message })
                            })
                    })
                    .catch(error => {
                        res.render('errorpage', { message: error.message })
                    })
            })
            .catch(error => {
                res.render('errorPage', { message: error.message })
            })
    } else {
        res.render('errorPage', { message: "The passwords do not match." })
    }
})


//----------------------------------
// RESET PASSWORD PAGE GET ROUTE
//----------------------------------
app.get('/resetpassword', (req, res) => {
    res.render('resetpassword')
})


//----------------------------------
// RESET PASSWORD PAGE POST ROUTE
//----------------------------------
app.post('/resetpassword', (req, res) => {
    const email = req.body.email
    const auth = firebase.auth()

    if (email != "") {
        auth.sendPasswordResetEmail(email)
            .then(result => {
                res.redirect('/login')
            })
    } else {
        res.render('errorPage', { message: "Enter a valid email" })
    }
})

const multer = require('multer');
const path = require('path');

const MAX_FILESIZE = 1020 * 1000 // 1000 kb
const fileTypes = /jpeg|jpg|png|gif/;

const storageOptions = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './public/images');
    },
    filename: (req, file, callback) => {
        callback(null, 'image' + Date.now() + path.extname(file.originalname))
    }
})

const imageUpload = multer({
    storage: storageOptions,
    limits: { fileSize: MAX_FILESIZE },
    fileFilter: (req, file, callback) => {
        const ext = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (ext && mimetype) {
            return callback(null, true)
        } else {
            return callback('Error: Images (jpeg, jpg, png, gif) only');
        }
    }
}).single('file_source');

//----------------------------------
// SELLERPAGESETUP POST ROUTE
//----------------------------------

app.post('/sellerprofilesetup', auth, (req,res)=>{
    const CompanyLocation = req.body.clocation
    const CompanyName = req.body.cname 
    
    sellers.doc().set({
        Email : firebase.auth().currentUser.email,
        CompanyName,
        CompanyLocation,
        ProfilePicUrl : ""
    })

    res.redirect('/sellerprofile')
})

//----------------------------------
// SELLERPAGE GET ROUTE
//----------------------------------

//Lifting auth for easy testing
app.get('/sellerprofile', auth, (req, res) => {
    //get products, seller info 
    //check if the user has a seller profile
    sellers.get().then(sellersSnap=>{
        var found = false
        sellersSnap.forEach(seller =>{
            if(firebase.auth().currentUser.email == seller.data().Email){
                found = true
                //user has a seller profile set up so we render normally with their info
                var products = []
                productsCollection.get().then(productSnap => {
                    productSnap.forEach(product => {
                        if(product.data().SellerId == seller.id){ // each of their products is displayed
                            products.push(product)
                            //console.log(product.data())
                        }
                    })
                    return res.render('sellerprofile', {
                        products,
                        seller,
                        utils,
                        source: 'sellerprofile'
                   })
                })
            }
        })
        if(!found){
            return res.render('sellerprofilesetup')
        }
    }).catch(error=>{
        res.render('errorPage', { message: error })
    })

})

app.get('/sellerprofile/productupdate', (req, res) => {
    const _id = req.query._id;

    sellers.get().then(sellersSnap=>{
        sellersSnap.forEach(seller =>{
            if(firebase.auth().currentUser.email == seller.data().Email){
            productsCollection.doc(_id).get()
                .then(product => {
                    res.render('sellerprofile', {
                        product,
                        utils,
                        seller,
                        source: 'sellerproductUpdate'
                    })
                })
                .catch(error => {
                    res.render('errorPage', { message: error })
                })
            }
        })
    })
})

app.post('/sellerprofile/productupdate', (req, res) => {

    imageUpload(req, res, error => {
        if (error) {
            return res.render('errorpage', { message: error })
        } else if (!req.file) {
            //return res.render('errorpage', {message: "File not found!"})
            sellers.get().then(sellersSnap=>{
                sellersSnap.forEach(seller =>{
                    if(firebase.auth().currentUser.email == seller.data().Email){
            const productId = req.body.id;
            let data = {
                ProductCategory: req.body.category,
                ProductDescription: req.body.description,
                ProductImage: req.body.productImage,
                ProductPrice: req.body.price,
                ProductTitle: req.body.title,
                SellerId: seller.id
            }

            productsCollection.doc(productId).set(data)
                .then(result => {
                    res.redirect('/sellerprofile')
                })
                .catch(error => {
                    res.render('errorPage', {
                        source: '/sellerprofile#products',
                        error
                    });
                })
            }
        })
    })
        } else {
            sellers.get().then(sellersSnap=>{
                sellersSnap.forEach(seller =>{
                    if(firebase.auth().currentUser.email == seller.data().Email){
            const productId = req.body.id;
            let data = {
                ProductCategory: req.body.category,
                ProductDescription: req.body.description,
                ProductImage: req.file.filename,
                ProductPrice: req.body.price,
                ProductTitle: req.body.title,
                SellerId: seller.id
            }

            productsCollection.doc(productId).set(data)
                .then(result => {
                    res.redirect('/sellerprofile')
                })
                .catch(error => {
                    res.render('errorPage', {
                        source: '/sellerprofile#products',
                        error
                    });
                })
            }
        })
    })
        }
    })
})

app.post('/sellerprofile/productadd', (req, res) => {

    imageUpload(req, res, error => {
        if (error) {
            return res.render('errorpage', { message: error })
        } else if (!req.file) {
            return res.render('errorpage', { message: 'No file selected'});
        }
    
        //this code uploads the picture to firebase storage
        /*
        storage.bucket('gs://serinde-dae45.appspot.com').upload('./'+req.file.path)
        .catch(error=>{
            return res.render('errorpage', { message: error.message});
        })
        //then we need to delete it form local folder
        */
        
        sellers.get().then(sellersSnap=>{
            sellersSnap.forEach(seller =>{
                if(firebase.auth().currentUser.email == seller.data().Email){
                    let data = {
                        ProductCategory: req.body.category,
                        ProductDescription: req.body.description,
                        ProductImage: req.file.filename,
                        ProductPrice: req.body.price,
                        ProductTitle: req.body.title,
                        SellerId : seller.id
                    }

            
                    productsCollection.doc().set(data)
                        .then(result => {
                            res.redirect('/sellerprofile')
                        })
                        .catch(error => {
                            res.render('errorPage', {
                                source: '/sellerprofile#products',
                                error
                            });
                        })
                }
            })
        })
        
    })
})

app.post('/sellerprofile/productdelete', (req, res) => {
    const productId = req.body.id; //productId 

    //get imagefilename 
    productsCollection.doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                imagefilename = doc.data().ProductImage;
                fs.unlink('./public/images/' + imagefilename, (error) => {
                    if (error) {
                        res.render('errorpage', { message: 'fs.unlink error to delete image file' })
                    }
                })
            }
        })
        .catch(error => {
            res.render('errorpage', {
                source: 'sellerprofile#product',
                error
            })
        })
        //delete from firebase
    productsCollection.doc(productId).delete()
        .then(result => {
            res.redirect('/sellerprofile')
        })
        .catch(error => {
            res.render('errorpage', {
                source: 'sellerprofile#product',
                error
            })
        });
})


//----------------------------------
// USERPAGE GET ROUTE
//----------------------------------
app.get('/userprofile', (req, res) => {
    const userEmail = firebase.auth().currentUser.email
    console.log(userEmail)
    users.doc(userEmail).get().then(doc => {
        var data = doc.data()
        res.render('userprofile', { data })
    })
})


//----------------------------------
// UPDATE USERPAGE POST ROUTE
//----------------------------------
app.post('/updateuserprofile', auth, (req, res) => {

    const sellerid = "GGoWWB8HPBaTMJw4eGU3";
    const Email = req.body.email;
    const FirstName = req.body.firstName;
    const LastName = req.body.lastName;
    const ProfilePicUrl = ""

    sellers.doc(sellerid).set({ FirstName, LastName, Email, ProfilePicUrl })
        .then(result => {
            res.redirect('/userprofile')
        })
        .catch(error => {
            res.render('errorpage', { message: error.message })
        })

})



//----------------------------------
// HOMEPAGE GET ROUTE
//----------------------------------
app.get('/', (_req, res) => {
    var products = []
    var categories = []
    var uniqueCategories = []
    productsCollection.get()
        .then(productSnap => {
            productSnap.forEach(singleProduct => {
                    //store categories and products
                    categories.push(singleProduct.data().ProductCategory)
                    products.push(singleProduct)
                })
                //filter by unique categories
            uniqueCategories = Array.from(new Set(categories))
                //console.log(uniqueCategories)

            if(isAdmin(firebase.auth().currentUser.email)){// rendering different homepage for admins
                res.render('adminstorefront', {
                    nav: 'adminstorefront',
                    fb: firebase,
                    products,
                    uniqueCategories
                });
            }else{
                res.render('storefront', {
                    nav: 'storefront',
                    fb: firebase,
                    products,
                    uniqueCategories
                });
            }
        })
        .catch(error => {
            res.render('errorpage', { message: error.message })
        })



    //----------------------------------
    // CONTACT PAGE GET ROUTE
    //----------------------------------
    app.get('/contact', (req, res) => {
        res.render('main.handlebars', { nav: 'contact' });
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
                pass: '987654321Ab' // generated ethereal password
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

            res.render('main.handlebars', { msg: 'Email has been sent' });
        });
    });
    //==========================================================
    //NODEMAILER CONFIG. ENDS
    //==========================================================
})



//==========================================================
//logout 
//==========================================================
app.get('/logout', (req, res) => {
    firebase.auth().signOut()
        .then(result => {
            res.redirect('/');
        })
        .catch(error => {
            res.send(error)
        })
})

//auth functions
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

//===================================================
// SEARCH BAR SUBMIT BUTTON REDIRECT FUNCTION
//===================================================

function redirect() {
    document.location.href = '/browse/' + document.getElementById('search').value;
    return false;
}

app.get('/browse', (req, res) => {
    res.render('search');
});

//======================================================
//           CATEGORIES LINKS
//======================================================
app.get('/menTops', (req, res) => {
    res.render('menTops');
});

app.get('/menBottoms', (req, res) => {
    res.render('menBottoms');
});

app.get('/menFootwear', (req, res) => {
    res.render('menFootwear');
});

app.get('/womenTops', (req, res) => {
    res.render('womenTops');
});

app.get('/womenBottoms', (req, res) => {
    res.render('womenBottoms');
});

app.get('/womenFootwear', (req, res) => {
    res.render('womenFootwear');
});

app.get('/childrenTops', (req, res) => {
    res.render('childrenTops');
});

app.get('/childrenBottoms', (req, res) => {
    res.render('childrenBottoms');
});

app.get('/childrenFootwear', (req, res) => {
    res.render('childrenFootwear');
});

app.get('/bodyLotionsAndCreams', (req, res) => {
    res.render('bodyLotionsAndCreams');
});

app.get('/facialCleansers', (req, res) => {
    res.render('facialCleansers');
});

app.get('/facialTreatments', (req, res) => {
    res.render('facialTreatments');
});

//=======================================================
//
//=======================================================