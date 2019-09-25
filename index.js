const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const pa = require('path');
const nodemailer = require('nodemailer');
const session  = require ('express-session')


// All npm imports
const express = require('express')
const app = express()

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


// //----------------------------------
// // HOMEPAGE GET ROUTE
// //----------------------------------
// app.get('/', (req, res) => {
//     res.send('home page found')
// })
  })
