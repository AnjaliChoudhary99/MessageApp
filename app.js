require("dotenv").config();
const express= require("express");
const app= express();
const port = 3000;


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
app.use(passport.session());


const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/MessageAppDB");



const messageAppSchema = new mongoose.Schema({

  username:String,
  email:String,
  password:String,
  chat:[{
    person:String,
    New:Boolean,
    messages:[{
      sender:String,
      text:String
    }]
  }]
});



messageAppSchema.plugin(passportLocalMongoose);

const MessageAppModel = new mongoose.model("usersCollection",messageAppSchema);

passport.use(MessageAppModel.createStrategy());
passport.serializeUser(MessageAppModel.serializeUser());
passport.deserializeUser(MessageAppModel.deserializeUser());


var currentUser="";


//send home page on get request to home route
app.get("/", function(req, res){
  console.log("GET request on home route.");
  res.render("home", {signUpMessage:"", signInMessage:""});
});





app.get("/users", function(req,res){
  if(req.isAuthenticated()){
    MessageAppModel.find({}, {_id:0, username:1}, function (err, docs) {
      if (err){
          console.log(err);
      }
      else{
        res.render("users", {newList:docs, length:docs.length})
      }
    });
  }
  else{
    res.redirect("/");
  }
});




app.get("/messages", function(req, res){
  if(req.isAuthenticated()){

    //needed parameters, chat array of curent users
    //sorted array according to who all have new field set to trues.
    //and then we will render the array




    res.render("messages");
  }
  else{
    res.redirect("/");
  }
});




app.get("/dashboard", function(req, res){
  if(req.isAuthenticated()){
    res.render("dashboard");
  }
  else{
    res.redirect("/");
  }
});











//when a text message is sent through the messageBox to a person,
// save it to sender's and reciever's database
//amd sets New = false, in currentUser's chat array in DB which has person as the reciever.
//and render the messageBox.ejs page with updated database
//by sending get request to /chat/:person route


//this route is never seen in URLs coz, it gets a GET request
//does its work to update DB's//and sends the get request to another route
//responsible for rendering the updated page of MmessageBox

app.post("/messege/:person", function(req, res){



  console.log("req.body is : ", req.body);
  const sendedText = req.body.message;
  console.log("sendedText is : ", req.body.message);
  const newMessage = {
    sender: currentUser,
    text:sendedText
  }
  console.log("newMwssage object is : ", newMessage);
  const reciever = req.params.person;
  console.log(req.params.person , "is the reciever for message sent by ", currentUser);






//saving to sender's DB
  MessageAppModel.findOne({username:currentUser}, function(err, found){
  if(!found)console.log("error in finding sender's DB is: ", err);
  else{
    // console.log("proceding to save into the sender's DB");
    // console.log("found is: ",found);
    // console.log("found.chat is : ",found.chat);
    const element = found.chat.find(function(element){
        return element.person === reciever;
      }
    );
    // console.log("element is : ", element);

    if(element === undefined){
      console.log("the element returned is : undefined");
      const sendedChatObject = {
        person:reciever,
        New:false,
        messages:[{
          sender:currentUser,
          text:sendedText}]
      }
    found.chat.push(sendedChatObject) ;
    }
    else{
      console.log("returned element is not undefined");
      element.messages.push(newMessage);
    }
    found.save();
    // console.log("found.chat array is : ", found.chat);
    console.log("successfully saved to sender's dB");
  }
});






//saving to reciever's DB
  MessageAppModel.findOne({username:reciever}, function(err, found){
  if(!found)console.log("error in finding reviever's DB is: ", err);
  else{
    console.log("proceding to save into the reciever's DB");
    // console.log("found is: ",found);
    // console.log("found.chat is : ",found.chat);
    const element = found.chat.find(function(element){
        return element.person === currentUser;
      }
    );
    // console.log("element is : ", element);
    if(element === undefined){
      console.log("the element returned is : undefined");
      const recievedChatObject = {
        person:currentUser,
        New:true,
        messages:[{
          sender:currentUser,
          text:sendedText}]
      }
    found.chat.push(recievedChatObject) ;
    }
    else{
      console.log("returned element is not undefined");
      element.messages.push(newMessage);
    }

    found.save();
    // console.log("found.chat array is : ", found.chat);
    console.log("successfully saved to reciever's dB");
    res.redirect("/chat/" + reciever);
    }

  });





});








app.get("/chat/:person", function(req, res){
  if(req.isAuthenticated()){

      const reciever = req.params.person;
      console.log("reciever is : ", reciever);
      console.log(currentUser , " wants to chat with ", reciever);




      //set New :false for the person in current user's dataBase, once the messageBox with that person is opened
      MessageAppModel.findOne({username:currentUser}, function(err, found){
        if(err)console.log("setting true to false, error encountered: ", err);


        // console.log("setting true to false, so found doc is: ", found);
        console.log("setting true to false, so found.chat is: ", found.chat);

        if(found.chat.length ==0) return 0;
        else{
          const element = found.chat.find(function(element){
              if(element.person === reciever){
                element.New = false;
              }
            }
          );

        }
        console.log("setting true to false, so revised found.chat is: ", found.chat);
      });













      MessageAppModel.findOne({username:reciever}, function(err, found){
       if(err) console.log("error in rendeing messageBox is: ", err);
       else{

        // console.log("found is: ", found)
        // console.log("found.chat is : ", found.chat);

        const element = found.chat.find(function(element){
            return element.person === currentUser;
          }
        );
         // console.log("element found is: " , element);

         if(element === undefined || element == null){
           res.render("messageBox", {person: reciever, chatList:[]})
           }
           else{
             res.render("messageBox", {person: reciever, chatList: element.messages});
           }
         }
       });
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



app.post("/", function(req, res){
  MessageAppModel.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log("entered post route ")
      console.log("ERROR while registering user: ", err);
      res.render("home", {signUpMessage:"", signInMessage:err});
    }
    else{
      passport.authenticate("local")(req, res, function(){
        res.render("home", {signUpMessage:"", signInMessage:"Registered successfully. Sign-In with your details."});
      });
    }
  });
});






app.post("/login", function(req, res){

  const user = new MessageAppModel({
    username:req.body.username,
    password:req.body.password
  });


currentUser=req.body.username;

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        console.log("login for the user authenticated");
        res.redirect("/dashboard");
      });
    }
  });
});










app.listen(port, function(){
  console.log("Server listening on port ", port);
});
