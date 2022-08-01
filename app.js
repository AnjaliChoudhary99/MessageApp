require("dotenv").config();
const express= require("express");
const app= express();
const port = 3002;


const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose= require("passport-local-mongoose");


const ejs = require("ejs");
app.set("view engine", "ejs");

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:true}));

app.use(express.static(__dirname + '/public'));



app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
 }));
app.use(passport.initialize());
app.use(passport.session())

const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/MessageAppDB");



const messageAppSchema = new mongoose.Schema({

  username:String,

  email:String,

  password:String


});

messageAppSchema.plugin(passportLocalMongoose);

const messageAppModel = new mongoose.model("usersCollection",messageAppSchema);

passport.use(messageAppModel.createStrategy());
passport.serializeUser(messageAppModel.serializeUser());
passport.deserializeUser(messageAppModel.deserializeUser());





app.get("/", function(req, res){
  console.log("GET request on home route.");
  res.render("home", {signUpMessage:"", signInMessage:""});
});




app.post("/", function(req, res){


  messageAppModel.register({username: req.body.username}, req.body.password, function(err, user){

    if(err){
      console.log("ERROR while registering user: ", err);
    }

    else{

      passport.authenticate("local")(req, res, function(){
        console.log("req.user is : ", req.user);
        res.render("home", {signUpMessage:"", signInMessage:"Registered successfully. Sign-In with your details."});

      });
    }
  });
});


app.post("/login", function(req, res){
  const user = new messageAppModel({
    username:req.body.username,
    password:req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        console.log("login for the user authenticated");
        res.redirect("/dashboard");
      });
    }
  })
})



app.get("/dashboard", function(req, res){
  if(req.isAuthenticated()){
    res.render("dashboard");
  }
  else{
    res.redirect("/");
  }
});


app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});









app.listen(port, function(){
  console.log("Server listening on port ", port);
});
