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



app.get("/", function(req, res){
  res.render("home", {signUpMessage:"", signInMessage:""});
});


//rendering the list of existing users
app.get("/users", function(req,res){
  if(req.isAuthenticated()){
    MessageAppModel.find({}, {_id:0, username:1}, function (err, docs){
      if (err){
          console.log(err);
          res.redirect("/");
      }
      else{
      console.log("users found are " , docs);
      var array = [];
      for (var i = 0; i < docs.length; i++) {
        if(docs[i].username !== currentUser){
        array.push(docs[i]);
        }
      }
        res.render("users", {array:array});
      }
    });
  }
  else{
    res.redirect("/");
  }
});




app.get("/messages", function(req, res){
  if(req.isAuthenticated()){
  console.log(currentUser,"'s database has been checked");
  console.log("refreshing the /messages route");

    MessageAppModel.findOne({username:currentUser}, function(err, found){
      if(err){
        console.log("error in new messages list :", err);
      }else{
        console.log("found chat list of currentUser for message link is: ", found.chat);
        //found.chat is an array, it is the chat array of current user,
        //whose each element represents chat with a particular user
        var newChatElements=[];
        found.chat.forEach(function(item){
          if(item.New == true){
            newChatElements.push(item);
          }
        });



        console.log("type of newChatElements is: ", typeof(newChatElements));
        if(newChatElements.length == 0){
          console.log("no such chats");
          var message = "No new messages!"
        }else{
          console.log("array of elements with boolean field = true are: ");
          newChatElements.forEach(function(item){
          console.log(item.person);

          message = "";
          });
        }
        res.render("messages", {newChatElements:newChatElements, message:message});
      }
    });
  }else{
    res.redirect("/");
  }
});





        // });
        // console.log("no of chats with New  field as true are: ", n);
        // console.log("new messages are from these users : ", newList)
        // console.log("length of new list is :", newList.length)
        //
        // if(newList.length ==0){
        //
        // }else{
        //
        // }




app.get("/dashboard", function(req, res){
  if(req.isAuthenticated()){
    res.render("dashboard", {currentUser:currentUser});
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

app.post("/messege/:reciever", function(req, res){

  const reciever = req.params.reciever;
  console.log("chat object from ", currentUser, " to ", reciever ," is : ", req.body);
  const sendedText = req.body.message;
  console.log("sended text is : ", req.body.message);

  const newMessage = {
    sender: currentUser,
    text:sendedText
  }

  console.log("newMwssage object made is : ", newMessage);




//saving to sender's DB
  MessageAppModel.findOne({username:currentUser}, function(err, found){
  if(err){
    console.log("Error is finding the sender's dB : ", err);
  }
  else{
    console.log("Saving to sender's database");
    console.log("found document for current user is: ", found);

    const element = found.chat.find(function(element){
        return element.person === reciever;
      }
    );

    console.log("element is : ", element)

    if(element === undefined){
      console.log("appending to chat array as no existing chats with reciever ", reciever);

      const sendedChatObject = {
        person:reciever,
        New:false,
        messages:[{
          sender:currentUser,
          text:sendedText}]
      }
    found.chat.push(sendedChatObject) ;
    }else{
      console.log("chats with ", reciever, " already exists.");
      // element.New = false;
      element.messages.push(newMessage);

    }
    found.save();

    console.log("updated doc in sender's dB is : ",found)
    console.log("successfully saved to sender's dB");
  }
});






//saving to reciever's DB
  MessageAppModel.findOne({username:reciever}, function(err, found){
  if(err){
    console.log("Error is finding the reciever's dB : ", err);
  }
  else{

    const element = found.chat.find(function(element){
        return element.person === currentUser;
      }
    );

    if(element === undefined){
    console.log("appending to chat array as no existing chats with sender ", currentUser);

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
      console.log("appending the message to message array as chats with sender already exist");
      element.New = true;
      element.messages.push(newMessage);
    }

    found.save();

    console.log("updated doc in reciever's dB is : ",found)
    console.log("successfully saved to reciever's dB");

    res.redirect("/chat/" + reciever);
    }
  });
});








app.get("/chat/:person", function(req, res){
  if(req.isAuthenticated()){
      const reciever = req.params.person;



      //set New :false for the person in current user's dataBase, once the messageBox with that person is opened
      MessageAppModel.findOne({username:currentUser}, function(err, found){
        if(err){
          console.log("error encountered in setting true to false : ", err);
        }
        else{

          const element = found.chat.find(function(element){
              return element.person === reciever;
            }
          );
          console.log("setting true to false, so found.chat is: ", found.chat);

          if(element === undefined){
            console.log("no previous chats with this person");
          }
          else{
            console.log("UPDATING FINALLY");

            console.log("element before found.save", element);
            element.New = false;

            found.save();
            
            console.log("element after found.save", element);
            console.log("boolean for the opened chat successfully set to false");


          }

        }
      });




      MessageAppModel.findOne({username:currentUser}, function(err, found){
       if(err){
         console.log("error in rendeing messageBox is: ", err)
       }
       else{

        const element = found.chat.find(function(element){
            return element.person === reciever;
          }
        );
         // console.log("element found is: " , element);

         if(element === undefined || element == null){
           res.render("messageBox", {reciever: reciever, chatList:[]})
           }
           else{
             res.render("messageBox", {reciever: reciever, chatList: element.messages});
           }
         }
       });
  }
  else{
    res.redirect("/");
  }
});








// Invoking logout() will remove the req.user property and clear the login session (if any).

app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});



//user sign-up

app.post("/", function(req, res){
  MessageAppModel.find({username:req.body.username}, function(err, found){
    if(err){
      console.log(err);
      res.render("home", {signInMessage:err, signUpMessage:""});
    }
    else if(found.length == 0){

      MessageAppModel.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){

          console.log("ERROR while registering user: ", err);
          res.render("home", {signUpMessage:err, signInMessage:err});
        }else{
            passport.authenticate("local")(req, res, function(){
            res.render("home", {signUpMessage:"", signInMessage:"Registered successfully. Sign-In with your details."});
          });
        }
      });

    }else{
      console.log(found);
      res.render("home", {signInMessage:"Username already taken, try others.", signUpMessage:"Username already taken, try others."});
    }
  });
});


























//user log-in
app.post("/login", function(req, res){
  const user = new MessageAppModel({
    username:req.body.username,
    password:req.body.password
  });

  //Passport exposes a login() function on req (also aliased as logIn()) that can be used to establish a login session.
  //When the login operation completes, user will be assigned to req.user

  //When a request comes through, passport behind the scenes has already interpreted the request header
  //by deserializing the cookie and determines if it represents a user.
  //if the user or the request header does not represent a user, the request is unauthorised.
  //else the req.login() generates a session for a user, which represents how long a login is good for without having to re-authenticate.

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{

      console.log("assigned req.user to the user is : ", req.user);
      console.log("req.body is : ", req.body);
      currentUser = req.user.username;
      passport.authenticate("local")(req, res, function(){
      res.redirect("/dashboard");
      });
    }
  });
});





app.listen(port, function(){
  console.log("Server listening on port ", port);
});
