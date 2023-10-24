const express = require('express')
const MongoClient = require('mongodb').MongoClient
const bcrypt = require('bcrypt')
const session = require('express-session')
const cors = require("cors");
const fs = require('fs')

const clientDB = new MongoClient("mongodb://127.0.0.1:27017/")
const db = clientDB.db("DBUsers")
const collectionUsers = db.collection("users")

const APP = express()
const PORT = 5000

let isUserExist = false
let isEmailExist = false
let userChecked = false 


async function listDatabases(client){
    databasesList = await client.db().admin().listDatabases();
    
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
};

clientDB.connect().then(mongoClient => {
    console.log(`Data base "${mongoClient.options.dbName}" has been connected`)
    listDatabases(clientDB)
})

APP.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
APP.set('view engine', 'ejs')
APP.use(express.json())
APP.use(session({
    secret: 'thisSecretKey',
    cookie: {
        sameSite: 'strict'
    }
}))
APP.use(express.static(__dirname + '/src/mainPage/'))
APP.use(express.static(__dirname + '/src/registrationPage/'))
APP.use(express.static(__dirname + '/src/autorizationPage/'))
//APP.use(express.static(__dirname + '/workpage/'))
APP.use(express.urlencoded({extended: false}))

APP.get('/', (req, res) => {
    console.log(__dirname + '../src/mainPage/')
    res.render('mainPage')
})

APP.get('/registration', (req, res) => {
    if (isUserExist){ 
        if (isEmailExist){ 
            res.render('registrationPage', {errorAlertLogin: "Логин занят", errorAlertEmail: "Email занят"})
            isEmailExist = false
            isUserExist = false
            return 0
        }
        res.render('registrationPage', {errorAlertLogin: "Логин занят", errorAlertEmail: ""})
        isUserExist = false
    } 

    if (isEmailExist){ 
        if (isUserExist){ 
            res.render('registrationPage', {errorAlertLogin: "Логин занят", errorAlertEmail: "Email занят"})
            isUserExist = false
            isEmailExist = false
            return 0
        }
        res.render('registrationPage', {errorAlertLogin: "", errorAlertEmail: "Email занят"})
        isEmailExist = false
    } 
    
    else{
        res.render('registrationPage', {errorAlertLogin: "", errorAlertEmail: ""})
    }
})

APP.get('/auth', (req, res) => {
    if (userChecked){
        res.render('autorizationPage', {errorAuth: "Неверный логин или пароль"})
        userChecked = false
    }
    else{
        res.render('autorizationPage', {errorAuth: ""})
    }
})

// APP.get('/static/js/main.effe100f.js', (req, res) => {
//     res.sendFile(__dirname + '/workpage/build/static/js/main.effe100f.js')
    
// })

APP.get('/work', (req, res) => {
    if (!req.session.authorized){
        res.redirect('/auth') 
    }
    else{
        console.log(req.session)
        res.redirect("http://localhost:3000/")
    }
    
})

APP.post("/getNewStorage", (req, res) => {
    
    if (req.body.newStorage.nameStorage == '' || req.body.newStorage.typeStorage == null){
        res.sendStatus(202)
    }
    console.log(req.body)
})

APP.get("/test", (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.json({"smth": "test"})
})

APP.post('/auth-user', (req, res) => {
    collectionUsers.findOne({login: req.body.login})
    .then((user) => {
        const validPassword = bcrypt.compareSync(req.body.password, user.password)
        console.log(user)
        if (user == 0){
            userChecked = true
        }
        if (!validPassword){
            userChecked = true
        }
    })
    .then((user) => {
        if (userChecked){
            res.redirect('/auth')
        }
        else{
            req.session.user = user
            req.session.login = req.body.login
            req.session.authorized = true
            res.redirect('/work')
        }
    })
})

APP.post('/reg-user', (req, res) => {
    if (!req.body){
        return res.sendStatus(400)
    }

    //Is user or email reserved
    collectionUsers.countDocuments({login: req.body.login})
    .then(function(numItems){
        if (numItems > 0){
            isUserExist = true
        }
    })
    .then(() => collectionUsers.countDocuments({email: req.body.email}))
    .then((numItems) =>{
        if (numItems > 0){
            isEmailExist = true
        }
    })
    .then(() => {
        if(isEmailExist || isUserExist){
            res.redirect('/registration')
        }
        else{
            regUser(req.body)
            res.cookie('login', req.body.login, {secure: true})
            req.session.login = req.body.login
            req.session.authorized = true
            fs.mkdirSync(`server/files/${req.body.login}`)
            res.redirect('/work')
        }
    })

})

async function regUser(req){
    console.log(req)
    try{
        const hashPassword = bcrypt.hashSync(req.password, 6)
        let user = {
            login: req.login,
            email: req.email,
            password: hashPassword
        }
    
        let result = await collectionUsers.insertOne(user)
        console.log(result)
    }
    catch(err){
        console.log(err)
    }
}

APP.listen(PORT, () => {
    console.log(`Server has been started on port ${PORT}`)
})
