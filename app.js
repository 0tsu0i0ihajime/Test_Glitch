const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')

const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "form.html"))
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if(username && password){
        if(username === 'admin' && password === 'password'){
            // req.session.username = username;
            res.redirect('https://www.youtube.com')
        }else{
            res.send('/login?error=Invalid username or password')
        }
    }else{
        res.send('Please enter a username and password')
        setTimeout(()=>{
            res.redirect('https://www.google.com')
        },2000)
    }
});

app.listen(3000, ()=>{
    console.log('App listening on port 3000')
});
