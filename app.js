const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')

const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, "public", "form.html"))
// });

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if(username === 'admin' && password === 'password'){
        req.session.username = username;
        res.redirect('/');
    }else{
        res.redirect('/login?error=Invalid username or password');
    }
});

app.get('/', (req, res) => {
    if(req.session.username === 'admin'){
        res.render('index', { username: req.session.username });
    }else{
        res.render('login');
    }
});

app.listen(3000, ()=>{
    console.log('App listening on port 3000')
});
