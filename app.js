const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const args = [
    '-x --audio-format mp3',
    '--output', '%(title)s.mp3'
]
// const check_opts = '--simulate'
const playlist_link = '--dump-json'

app.use(session({
    secret: 'My Secret Key: Common',
    resave: false,
    saveUninitialized: true,
}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "form.html"))
});

app.post('/login', (req, res) => {
    let url = 'https://www.google.com'
    const { username, password } = req.body;

    if(username && password){
        if(username === 'admin' && password === 'password'){
            req.session.username = username;
            res.cookie('sessionId', req.session.id);
            res.sendFile(path.join(__dirname, "public","stream.html"))
        }else{
            res.send('<body>login error=Invalid username or password<br><a href="'+url+'">Visit Login Form</a></body>')
        }
    }else{
        res.send('<body>Please enter a username and password<br><a href="'+url+'">Visit Login Form</a></body>')
    }
});

app.post('/stream', (req, res) => {
    const { sessionID } = req.cookies;
    if(!sessionID || !req.session.username){
        res.redirect('/');
        return;
    }
    const { youtubeLink } = req.body;
    req.session.url = youtubeLink;
    res.redirect('/play');
})

app.get('/play', (req, res) => {
    const url = req.session.url;
    if(!url){
        res.send('URL not found in session');
        return
    }
    const ytDlpProcess = spawn('yt-dlp', playlist_link, url);

    ytDlpProcess.stdout.on('data', (data)=>{
        const output = data.toString();
        if(output.inCludes('"_type": "playlist"')){
            req.session.link = []
            console.log(`This is a playlist: ${url}`)
            const info = JSON.parse(output);
            const entries = info.entries;
            for(const entry of entries){
                req.session.link.push(entry.webpage_url);
            }
            console.log(req.session.link)
        }
    })
    // res.render('play.ejs', { url: url });
})

app.listen(process.env.PORT || 8080, () => {
  console.log(`Server listening on port ${process.env.PORT || 8080}`);
});
