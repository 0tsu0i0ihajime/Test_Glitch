const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "form.html"))
});

app.post('/login', (req, res, next) => {
    let url = 'https://www.google.com'
    const { username, password } = req.body;

    if(username && password){
        if(username === 'admin' && password === 'password'){
            // req.session.username = username;
            res.redirect('https://www.youtube.com')
        }else{
            res.send('<body>login error=Invalid username or password<br><a href="'+url+'">Visit Login Form</a></body>')
        }
    }else{
        res.send('<body>Please enter a username and password<br><a href="'+url+'">Visit Login Form</a></body>')
    }
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Server listening on port ${process.env.PORT || 8080}`);
});
