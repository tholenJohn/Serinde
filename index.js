// All npm imports
const express = require('express')
const functions = require('firebase-functions');
var admin = require('firebase-admin')
const firebase = require('firebase')
const app = express()
const stripe = require('stripe')('pk_test_DuPogbGVY05NnsWipp3M3eCm001AB993JZ')
const bodyParser = require('body-parser')
const exphbs = require('express-handlebars')
const pa = require('path')
const nodemailer = require('nodemailer')
const session = require('express-session')
const fs = require('fs')
const brain = require('brain.js')
const utils = require('./utils.js')
var { Storage } = require('@google-cloud/storage')
const storage = new Storage({
    projectId: 'serinde-dae45',
    keyFilename: 'serinde-dae45-firebase-adminsdk-z0zyl-2c11c31be9.json'
});

const ShoppingCart = require('./models/ShoppingCart.js');
const Training = require('./training.js')

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


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//email config file
var emailContents = fs.readFileSync("email.json");
var jsonEmailContents = JSON.parse(emailContents);


//----------------------------------
// PORT ROUTE
//----------------------------------
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
})

//----------------------------------
// SESSION
//----------------------------------

app.use(session({
    secret: 'mysupersecretcode!!@#@#!A',
    saveUninitialized: true,
    resave: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
    }
}));

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
    if (oldEmail == userEmail) {
        return res.redirect('/userprofile', { nav: 'storefront', fb: firebase })
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
                                res.render('userprofile', { data, nav: 'userprofile', fb: firebase })
                            })
                        }) // creating another doc with the same data

                }
            })

            sellers.get().then(sellersSnap => {
                sellersSnap.forEach(seller => {
                    if (seller.data().Email == oldEmail) {
                        var newData = seller.data()
                        newData.Email = userEmail
                        sellers.doc(seller.id).set(newData) // updating seller email to new email change
                    }
                })
            })
        })
        .catch(error => {
            res.render('errorpage', { message: error.message })
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
                res.render('errorpage', { message: "The email is blank!" })
            } else
                res.render('errorpage', { message: error.message })
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
                                res.render('errorpage', { message: error.message })
                            })
                    })
                    .catch(error => {
                        res.render('errorpage', { message: error.message })
                    })
            })
            .catch(error => {
                res.render('errorpage', { message: error.message })
            })
    } else {
        res.render('errorpage', { message: "The passwords do not match." })
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
        res.render('errorpage', { message: "Enter a valid email" })
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

app.post('/sellerprofilesetup', auth, (req, res) => {
    const CompanyLocation = req.body.clocation
    const CompanyName = req.body.cname

    sellers.doc().set({
        Email: firebase.auth().currentUser.email,
        CompanyName,
        CompanyLocation,
        ProfilePicUrl: ""
    }).then(result => {
        res.redirect('/sellerprofile')
    })
})

//----------------------------------
// SELLERPAGE GET ROUTE
//----------------------------------

app.get('/sellerprofile', auth, (req, res) => {
    //get products, seller info 
    //check if the user has a seller profile
    sellers.get().then(sellersSnap => {
        var found = false
        sellersSnap.forEach(seller => {
            if (firebase.auth().currentUser.email == seller.data().Email) {
                found = true
                    //user has a seller profile set up so we render normally with their info
                var products = []
                var productIds = []
                productsCollection.get().then(productSnap => {
                    productSnap.forEach(product => {
                        if (product.data().SellerId == seller.id) { // each of their products is displayed
                            products.push(product)
                            productIds.push(product.id)
                        }
                    })
                    return res.render('sellerprofile', {
                        products,
                        productIds,
                        seller,
                        utils,
                        source: 'sellerprofile',
                        nav: 'storefront',
                        fb: firebase
                    })
                })
            }
        })
        if (!found) {
            return res.render('sellerprofilesetup')
        }
    }).catch(error => {
        res.render('errorpage', { message: error })
    })

})

app.get('/sellerprofile/productupdate', (req, res) => {
    const _id = req.query._id;

    sellers.get().then(sellersSnap => {
        sellersSnap.forEach(seller => {
            if (firebase.auth().currentUser.email == seller.data().Email) {
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
                        res.render('errorpage', { message: error })
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
            sellers.get().then(sellersSnap => {
                sellersSnap.forEach(seller => {
                    if (firebase.auth().currentUser.email == seller.data().Email) {
                        const productId = req.body.id;
                        let data = {
                            ProductCategory: req.body.category,
                            ProductDescription: req.body.description,
                            ProductImage: req.body.productImage,
                            ProductPrice: req.body.price,
                            ProductTitle: req.body.title,
                            ProductUrl: req.body.url,
                            SellerId: seller.id
                        }

                        productsCollection.doc(productId).set(data)
                            .then(result => {
                                res.redirect('/sellerprofile')
                            })
                            .catch(error => {
                                res.render('errorpage', {
                                    source: '/sellerprofile#products',
                                    error
                                });
                            })
                    }
                })
            })
        } else {
            storage.bucket('gs://serinde-dae45.appspot.com').upload('./' + req.file.path).then(result => {
                storage.bucket('gs://serinde-dae45.appspot.com').file(req.file.filename).getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500',
                }).then(url => {
                    sellers.get().then(sellersSnap => {
                        sellersSnap.forEach(seller => {
                            if (firebase.auth().currentUser.email == seller.data().Email) {
                                const productId = req.body.id;
                                let data = {
                                    ProductCategory: req.body.category,
                                    ProductDescription: req.body.description,
                                    ProductImage: req.file.filename,
                                    ProductPrice: req.body.price,
                                    ProductTitle: req.body.title,
                                    ProductUrl: url[0],
                                    SellerId: seller.id
                                }

                                productsCollection.doc(productId).set(data)
                                    .then(result => {
                                        res.redirect('/sellerprofile')
                                    })
                                    .catch(error => {
                                        res.render('errorpage', {
                                            source: '/sellerprofile#products',
                                            error
                                        });
                                    })
                            }
                        })
                    })
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
            return res.render('errorpage', { message: 'No file selected' });
        }

        storage.bucket('gs://serinde-dae45.appspot.com').upload('./' + req.file.path).then(result => {
                storage.bucket('gs://serinde-dae45.appspot.com').file(req.file.filename).getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500',
                }).then(url => {
                    sellers.get().then(sellersSnap => {
                        sellersSnap.forEach(seller => {

                            if (firebase.auth().currentUser.email == seller.data().Email) {
                                let data = {
                                    ProductCategory: req.body.category,
                                    ProductDescription: req.body.description,
                                    ProductImage: req.file.filename,
                                    ProductPrice: req.body.price,
                                    ProductTitle: req.body.title,
                                    ProductUrl: url[0],
                                    SellerId: seller.id
                                }

                                productsCollection.doc().set(data)
                                    .then(result => {
                                        return res.redirect('/sellerprofile')
                                    })
                                    .catch(error => {
                                        return res.render('errorpage', {
                                            source: '/sellerprofile#products',
                                            error
                                        });
                                    })
                            }
                        })
                    })
                }).catch(error => {
                    return res.render('errorpage', { message: error.message });
                })
            })
            .catch(error => {
                return res.render('errorpage', { message: error.message });
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
    users.doc(userEmail).get().then(doc => {
        var data = doc.data()
        res.render('userprofile', { data, nav: 'storefront', fb: firebase })
    })
})

//----------------------------------
// UPDATE USERPAGE POST ROUTE
//----------------------------------
app.post('/updateuserprofile', auth, (req, res) => {

    imageUpload(req, res, error => {
        var ProfilePicUrl = "";
        const userEmail = firebase.auth().currentUser.email
        var FirstName = req.body.firstName
        var LastName = req.body.lastName
        var Location = req.body.location

        if (error) {
            return res.render('errorpage', { message: error })
        } else if (!req.file) {
            users.doc(userEmail).update({ FirstName, LastName, Location })
                .then(result => {
                    res.redirect('/userprofile')
                })
                .catch(error => {
                    res.render('errorpage', { message: error.message })
                })
        } else {
            ProfilePicUrl = req.file.filename
            users.doc(userEmail).update({ FirstName, LastName, Location, ProfilePicUrl })
                .then(result => {
                    res.redirect('/userprofile')
                })
                .catch(error => {
                    res.render('errorpage', { message: error.message })
                })
        }


    })
})

//----------------------------------
//SHOPPING CART
//----------------------------------
app.post('/add2cart', auth, (req, res) => {

    let sc;
    if (!req.session.sc) {
        sc = new ShoppingCart();
    } else {
        sc = ShoppingCart.deserialize(req.session.sc)
    }

    const id = req.body.id;
    const title = req.body.title;
    const price = req.body.price;
    const image = req.body.image;
    sc.add({
        id,
        title,
        price,
        image
    });

    req.session.sc = sc.serialize();

    res.redirect('/cart');
})

app.post('/removeFromCart', (req, res) => {

    let sc;

    sc = ShoppingCart.deserialize(req.session.sc)


    const id = req.body.id;
    sc.remove({
        id
    });

    req.session.sc = sc.serialize();

    res.redirect('/cart');
})




app.get('/cart', (req, res) => {

    let sc;
    if (!req.session.sc) {
        sc = new ShoppingCart();
    } else {
        sc = ShoppingCart.deserialize(req.session.sc)
    }

    res.render('Cart', {
        nav: 'cart',
        sc,
        utils,
        fb: firebase
    });
})

app.get('/test', (req,res) => { 
    

        res.render('success');
})
//----------------------------------
// CHARGE CREDIT CARD GET ROUTE
//----------------------------------
app.post('/charge', (req, res) => {

    //create the customer that paid and render success page
    stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken
    }) 
    .then(customer => stripe.charges.create({
        customer: customer.id
    }))
    .then(res.render('success'))

        //The long work of normalizing and putting in the bought data to the user
        let sc;
        sc = ShoppingCart.deserialize(req.session.sc)
        let reducer = (accumulator, currentValue) => accumulator + currentValue;
        var ids = sc.getProductsNames();
        var iter = 0;
        var numOfCategory = [];
        var price = [];
        var totals = [];
        var means = [];
        var range_price = [];
        var normalizedprice = [];
        var currentProductPrice = [];
        var productEmailStuff = [];
        var sellerID = [];
        productsCollection.get().then(productSnap => {
            productSnap.forEach(product => {
                for(i of ids) {
                    if(product.id ==i) {
                        var temp = product.data().ProductCategory;
                        numOfCategory.push(temp);
                        currentProductPrice.push(parseFloat(product.data().ProductPrice));
                        var sellerInfo = {
                            id: product.data().SellerId,
                            productSold: product.data().ProductTitle 
                        }
                        sellerID.push(sellerInfo);
                        productEmailStuff.push(product.data().ProductTitle.toString());
                    }     
                }
            });
        }).then(function onSuccess(res) {
        productsCollection.get().then(productSnap => {
            for(i of numOfCategory) {
            productSnap.forEach(product => {
                    if(product.data().ProductCategory == i) {
                        var temp = parseFloat(product.data().ProductPrice);
                        price.push(temp);   
                } 
            }); if(price.length > 0) {
                totals.push(price.reduce(reducer));
                means.push(totals[totals.length - 1]/price.length);
                price.sort();
                range_price.push(price[price.length-1] - price[0]);
                normalizedprice.push((currentProductPrice[iter]
                    - price[0])
                    /range_price[range_price.length-1]);
                price = [];
            }
            iter++;
        };
        }).then(function onSuccess(res) {
            var calcHigh = 0;
            var calcMid = 0;
            var calcLow = 0;
            for(var i = 0; i < ids.length; i++) {
                
                if(normalizedprice[i] > 0.66) {
                    calcHigh = 1;
                    calcLow = calcMid = 0;
                } else if(normalizedprice[i] > 0.33) {
                    calcMid = 1;
                    calcLow = calcHigh = 0;
                } else {
                    calcLow = 1;
                    calcHigh = calcMid = 0;
                }
            var data = {
                ProductID: ids[i],
                ProductCategory: numOfCategory[i],
                high: calcHigh,
                mid: calcMid,
                low: calcLow,
            }
            users.doc(firebase.auth().currentUser.email).collection('bought').doc().set(data)
        }
        })
        })
        //sending email to current user that purchased information
        var emailerPass = jsonEmailContents.pass;
        var emailerEmail = jsonEmailContents.email;
        var transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            auth: {
                user: emailerEmail,
                pass: emailerPass
            },
        });
        
        var message = [];
        var massProductList = productEmailStuff[0];
        //combining all the products purchased for emailing
        for(var j = 1; j < productEmailStuff.length; j++) {
            massProductList.concat(", " + productEmailStuff[j]);
        }
        var mailOptions = {
            from: '"Nodemailer Contact" <tholenjohn@gmail.com>',
            to: firebase.auth().currentUser.email,
            subject: 'Conformation of purchase',
            text: `Hello, \nThank you for your purchase.`
        };
        //for sending out conformation of purchase
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            }
            else {
                console.log('Email sent: ' + info.response);
            }
        });

        //for sending email to seller
            sellers.get().then(sellerSnapshot =>{
                for(var i = 0; i < sellerID.length; i ++) {
                sellerSnapshot.forEach(sellerSnapshot2 =>{
                    if(sellerID[i].id == sellerSnapshot2.id) {
                        var messageToBeSent = {
                            from: '"Nodemailer Contact" <tholenjohn@gmail.com>',
                            to: sellerSnapshot2.data().Email,
                            subject: 'Your product has sold',
                            text: `Hello,\nYour product ` + sellerID[i].productSold +  ` has been purchased.`
                        };
                        transporter.sendMail(messageToBeSent, (error, info) => {
                            if (error) {
                                console.log(error);
                            }
                            else {
                                console.log('Email sent: ' + info.response);
                            }
                        });
                        
                    }
                })
            }
            
        }) 
       
    /*
    for (i of message) {    
            transporter.sendMail(i, (error, info) =>{
            if(error) {
                console.log(error);
            } else{
                console.log('Email sent: ' + info.response);
                wait = false;
            }
        }) 
    } */
        
})

//----------------------------------
// HOMEPAGE GET ROUTE
//----------------------------------

app.get('/', (_req, res) => {
    // arrays to display products of each category
    var products = []
    var categories = []
    var uniqueCategories = []

    // arrays to use for recommendation engine
    var tempProducts = []
    var recommendedRange


    // Recommendation engine
    let train = new Training()

    // get user's purchases and push them into 4 arrays
    if(firebase.auth().currentUser) {
        users.doc(firebase.auth().currentUser.email).collection('bought').get()
            .then(purchaseSnap => {
                if(purchaseSnap != undefined) {
                    purchaseSnap.forEach(purchase => {
                        // add the category and range values to training set and get recommended range
                        train.addItems(purchase.data().ProductCategory)
                        train.addRange(purchase.data().high, purchase.data().low, purchase.data().mid)
                        recommendedRange = train.getRange(_req.query.cat_id)
                    })
                }
            }).then(
                productsCollection.get()
                    .then(productSnap => {
                        productSnap.forEach(singleProduct => {
                                //store categories and products
                                if (_req.query.cat_id != undefined) {
                                    if (_req.query.cat_id == singleProduct.data().ProductCategory) {
                                        categories.push(singleProduct.data().ProductCategory)
                                        tempProducts.push(singleProduct)
                                    }
                                } else {
                                    categories.push(singleProduct.data().ProductCategory)
                                    products.push(singleProduct)
                                }
                            })
                //filter by unique categories
                uniqueCategories = Array.from(new Set(categories))
                //console.log(uniqueCategories)

            
            // assign products based on the result of recommendation engine
            if (_req.query.cat_id != undefined) {
                console.log(recommendedRange)
 
                if (recommendedRange === 'low') {
                    // sort array of products in ascending order when low value is preferred
                    tempProducts.sort((a,b) => parseFloat(a.data().ProductPrice) - parseFloat(b.data().ProductPrice))
                    products = [...tempProducts]
                } else if (recommendedRange === 'high') {
                    // sort array of products in descending order when high value is preferred
                    tempProducts.sort((a,b) => parseFloat(b.data().ProductPrice) - parseFloat(a.data().ProductPrice))
                    products = [...tempProducts]
                } else if (recommendedRange === 'mid') {

                    var within = []
                    var outside = []

                    // filter all prices of items in this category
                    var allPrices = tempProducts.map(tempProduct => parseFloat(tempProduct.data().ProductPrice))
                    var allSorted = allPrices.sort()
                    
                    var mini = allSorted[0]
                    var maxi = allSorted[allSorted.length - 1]
                    var divisor = maxi - mini


                    // filter within range to get array of items and push into products
                    for (let i = 0; i < tempProducts.length; i++) {
                        if( (tempProducts[i].data().ProductPrice - mini)/divisor > 0.33 && (tempProducts[i].data().ProductPrice - mini)/divisor <= 0.66) {
                            within.push(tempProducts[i])
                            tempProducts.splice(i, 1)
                            i = 0
                        } 
                    }
                    products = [...within]

                    for (let i = 0; i < tempProducts.length; i++) {
                        products.push(tempProducts[i])
                    }

                } else {
                    products = [...tempProducts]
                }
                
            }



            if (firebase.auth().currentUser) { // rendering different homepage for admins
                if (isAdmin(firebase.auth().currentUser.email)) {
                    res.render('adminstorefront', {
                        nav: 'adminstorefront',
                        fb: firebase,
                        products,
                        uniqueCategories,
                        images: storage.bucket('gs://serinde-dae45.appspot.com')
                    });
                }
            }
            res.render('storefront', {
                nav: 'storefront',
                fb: firebase,
                products,
                uniqueCategories,
                images: storage.bucket('gs://serinde-dae45.appspot.com')
            });
        })
        .catch(error => {
            console.log('????')
            res.render('errorpage', { message: error.message })
        })
            ) 
    } else {
        //for unregistered users don't train anything, just show items as normal
        productsCollection.get()
        .then(productSnap => {
            productSnap.forEach(singleProduct => {
                    //store categories and products

                    if (_req.query.cat_id != undefined) {
                        if (_req.query.cat_id == singleProduct.data().ProductCategory) {
                            categories.push(singleProduct.data().ProductCategory)
                            products.push(singleProduct)
                        }
                    } else {
                        categories.push(singleProduct.data().ProductCategory)
                        products.push(singleProduct)
                    }
                })
                //filter by unique categories
                uniqueCategories = Array.from(new Set(categories))
                //console.log(uniqueCategories)

            if (firebase.auth().currentUser) { // rendering different homepage for admins
                if (isAdmin(firebase.auth().currentUser.email)) {
                    return res.render('adminstorefront', {
                        nav: 'adminstorefront',
                        fb: firebase,
                        products,
                        uniqueCategories,
                        images: storage.bucket('gs://serinde-dae45.appspot.com')
                    });
                }
            }
            res.render('storefront', {
                nav: 'storefront',
                fb: firebase,
                products,
                uniqueCategories,
                images: storage.bucket('gs://serinde-dae45.appspot.com')
            });

        })
        .catch(error => {
            console.log('????')
            res.render('errorpage', { message: error.message })
        })
    }


    

})

//----------------------------------
// CONTACT PAGE GET ROUTE
//----------------------------------
app.get('/contact', (req, res) => {
    res.render('main.handlebars', { nav: 'storefront', fb: firebase });
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

app.get('/productdetail', (req, res) => {
    const productId = req.query._id
    var admin
    if (firebase.auth().currentUser) {
        admin = isAdmin(firebase.auth().currentUser.email)
    } else {
        admin = false
    }


    productsCollection.doc(productId).get()
        .then(product => {
            res.render('productdetail', {
                    product,
                    utils,
                    fb: firebase,
                    nav: 'storefront',
                    admin
                }) //, admin : isAdmin(firebase.auth().currentUser.email)})
        })
        .catch(error => {
            res.render('errorpage', { message: error.message, fb: firebase, nav: 'storefront' })
        })
})

app.post('/addfromproductdetail', (req, res) => {
    const productid = req.body.productid
    const quantity = req.body.quantity

    let sc;
    if (!req.session.sc) {
        sc = new ShoppingCart();
    } else {
        sc = ShoppingCart.deserialize(req.session.sc)
    }

    productsCollection.doc(productid).get().then(product => {
        for (var i = 0; i < quantity; i++) {
            sc.add({
                id: product.id,
                title: product.data().ProductTitle,
                price: product.data().ProductPrice,
                image: product.data().ProductImage
            })
        }
        res.render('cart', {
            nav: 'cart',
            sc,
            utils,
            fb: firebase
        });
    })


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
        res.render('login', { message: "Unauthorized access! Login to perform this action." })
    }
}

function adminAuth(req, res, next) {
    if (firebase.auth().currentUser && isAdmin(firebase.auth().currentUser.email)) {
        next()
    } else {
        res.render('login', { message: "Unauthorized access! Privileged users only." })
    }
}

function isAdmin(email) {
    return email == "khoffmeister1@uco.edu" // || email == ""
}

//===================================================
// ADMIN ROUTES
//===================================================

app.get('/adminsellers', adminAuth, (req, res) => {
    sellers.get().then(sellersSnapshot => {
        res.render('adminsellers', { sellers: sellersSnapshot, fb: firebase }) // sending sellers to EJS
    })
})

app.post('/admindeleteproduct', adminAuth, (req, res) => {
    const sender = req.body.sender
    const sellerid = req.body.sellerid
    const selleremail = req.body.selleremail
    const productid = req.body.productid

    productsCollection.doc(productid).delete().then(result => {

        if (sender == "admin") {
            productsCollection.where("SellerId", "==", sellerid).get().then(productsFound => {
                res.render('adminproducts', { products: productsFound, fb: firebase, sellerid, selleremail })
            })
        } else if (sender == "storefront") {
            res.redirect('/')
        }

    }).catch(error => {
        res.render('errorpage', { message: error.message })
    })
})

app.post('/adminclearseller', adminAuth, (req, res) => {
    const sellerid = req.body.sellerid
    productsCollection.get().then(products => {
        products.forEach(product => {
            if (product.data().SellerId == sellerid) {
                productsCollection.doc(product.id).delete()
            }
        })
        sellers.doc(sellerid).delete().then(result => {
            res.redirect('/adminsellers')
        })
    })
})

app.post('/adminproducts', adminAuth, (req, res) => {
    const sellerid = req.body.sellerid
    const selleremail = req.body.selleremail

    productsCollection.where("SellerId", "==", sellerid).get().then(productsFound => {
        res.render('adminproducts', { products: productsFound, fb: firebase, sellerid, selleremail })
    })
})

app.get('/adminusers', adminAuth, (req, res) => {
    users.get().then(usersSnapshot => {
        res.render('adminusers', { users: usersSnapshot, fb: firebase }) // sending users to EJS
    })
})

app.post('/adminuserreset', adminAuth, (req, res) => {
    const email = req.body.email
    firebase.auth().sendPasswordResetEmail(email).then(result => {
        res.redirect('/adminusers')
    }).catch(error => {
        res.render('errorpage', { message: error.message })
    })
})

app.post('/adminuserdelete', adminAuth, (req, res) => {

    const email = req.body.email

    admin.auth().getUserByEmail(email).then(user => {
        sellers.get().then(sellersSnapshot => {
            sellersSnapshot.forEach(seller => {
                if (seller.data().Email == email) {
                    productsCollection.get().then(productSnapshot => {
                        productSnapshot.forEach(product => {
                            if (product.data().SellerId == seller.id) {
                                productsCollection.doc(product.id).delete()
                            }
                        })
                    })
                    sellers.doc(seller.id).delete().then(result => {
                        admin.auth().deleteUser(user.uid).then(result => {
                            users.doc(email).delete()
                            res.redirect('/adminusers')
                        })
                    })
                }
            })
        })
    })
})

//================================
// SEARCH BAR SUBMIT BUTTON 
//================================

app.get('/search', (_req, res) => {
    var products = []
    var categories = []
    var uniqueCategories = []

    productsCollection.get()
        .then(productSnap => {
            productSnap.forEach(singleProduct => {

                    //store categories and products
                    if (_req.query.cat_id != undefined) {
                        if (_req.query.cat_id == singleProduct.data().ProductCategory) {
                            categories.push(singleProduct.data().ProductCategory)
                            products.push(singleProduct)
                        }
                    } else {
                        categories.push(singleProduct.data().ProductCategory)
                        products.push(singleProduct)
                    }
                })
                //filter by unique categories
            uniqueCategories = Array.from(new Set(categories))

            if (firebase.auth().currentUser) { // rendering different homepage for admins
                if (isAdmin(firebase.auth().currentUser.email)) {
                    res.render('/search', {
                        nav: 'search',
                        fb: firebase,
                        products,
                        uniqueCategories,
                        images: storage.bucket('gs://serinde-dae45.appspot.com')
                    });
                }
            }
            res.render('search', {
                nav: 'search',
                fb: firebase,
                products,
                uniqueCategories,
                images: storage.bucket('gs://serinde-dae45.appspot.com')
            });
        })
        .catch(error => {
            console.log('????')
            res.render('errorpage', { message: error.message })
        })

})