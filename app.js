const express = require('express'),
      session = require('express-session'),
      bodyParser = require("body-parser"),
      path = require("path"),
      cookieParser = require("cookie-parser"),
      fs = require("fs"),
      { spawn } = require("child_process"),
      crypto = require('crypto'),
      http = require('http');

let users = JSON.parse(fs.readFileSync('pass.json', 'utf8'));
let tar_URL = "https://www.google.com";
const app = express();

fs.watch('pass.json', (event, filename)=>{
  if(event === 'change'){
    console.log(`${filename}change!`)
    users = JSON.parse(fs.readFileSync('pass.json', 'utf8'));
  }
})

app.use(
  session({
    secret: "My Secret Key: Common",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if(!username&&!password){
    res.send(`<body>Please enter a username and password<br><a href="${tar_URL}">Visit Login Form</a></body>`);
    return
  }
  
  if (username && password) {
    if(users[username] === password){
      req.session.username = username;
      const uniqueKey = `${username}:${password}`
      const sessionID = crypto.createHash('sha256').update(uniqueKey).digest('hex');
      res.cookie("sessionId", sessionID);
      res.sendFile(path.join(__dirname, "public", "stream.html"));
    }else{
      res.redirect('/')
      return
    }
  }
});

app.post("/stream", (req, res) => {
  const { sessionId } = req.cookies;
  if (!sessionId || !req.session.username) {
    res.redirect("/");
    return;
  }
  if (!req.body.url) {
    res.sendFile(path.join(__dirname, "public", "stream.html"));
    return;
  }
  const { url } = req.body;
  if (url.indexOf("　") !== -1) {
    res.send(
      '<body>全角スペース入力するな<br><a href="' +
      tar_URL +
      '">Visit Login Form</a></body>'
    );
    return;
  }
  req.session.url = url;
  // res.send(req.session)
  res.redirect("/play");
});

app.get("/send", (req, res) => {
  if(!req.session.filePath){
    res.redirect("/stream")
    return
  }else{
    const path = req.session.filePath;
    const stat = fs.statSync(path);
    const fileSize = stat.size;
    const range = req.header.range;
    if(range){
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] 
        ? parseInt(parts[1], 10)
        : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(path, {start, end});
      const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
      file.on('error', (err)=>{
        res.statusCode = 500;
        res.end(`Server Error: ${err.message}`)
        return
      });
      file.on('end', ()=>{
        res.end();
      });
    }else{
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked'
      };
      const readStream = fs.createReadStream(path);
      res.writeHead(200, head);
      readStream.pipe(res);
      readStream.on('error', (err)=>{
        res.statusCode = 500;
        res.end(`Server Error: ${err.message}`)
        return
      });
      readStream.on('end', ()=>{
        res.end();
      });
    }
    // readStream.on('open', ()=>{
      // res.set("Content-Type", "text/html");
      // res.send(`<!DOCTYPE html>
      // <html lang="ja">
      // <head>
      //     <meta charset="UTF-8">
      //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
      //     <title>Play</title>
      // </head>
      // <body>
      //   <audio controls src="/send"></audio>
      // </body>
      // </html>`)
  }
});

app.get("/play", (req, res) => {
  const targetString = '[ExtractAudio] Destination: ';
  const url = req.session.url;
  const { sessionId } = req.cookies;
  req.session.output = []
  const checkInfo = spawn("python3", ["info.py", url]);
  checkInfo.stdout.on("data", (data) => {
    console.log(data.toString());
    req.session.output += data.toString()
  });
  checkInfo.stderr.on('data',(data)=>{
    console.error(`stderr: ${data}`)
    res.send(`Error: ${data}`);
    return
  })
  checkInfo.on("exit", () => {
    req.session.lastLine = req.session.output.trim().split("\n").pop();
    if (!fs.existsSync(`public/${sessionId}`)) {
      fs.mkdirSync(`public/${sessionId}`);
    }
    fs.writeFileSync(`public/${sessionId}/data.json`, JSON.stringify(req.session.lastLine))
    req.session.Number = 0;
    delete req.session.url
    delete req.session.output
    const args = [
      '-o',
      `public/${sessionId}/%(title)s.%(ext)s`,
      '--extract-audio',
      '--audio-format',
      'mp3',
      // '--default-search',
      // 'ytsearch',
      JSON.parse(req.session.lastLine.replace(/'/g, "\""))[req.session.Number]
    ]
    const DLMusic = spawn("yt-dlp", args);
    DLMusic.stdout.on('data', (data)=>{
      req.session.output += data.toString();
      console.log(`stdout: ${data}`)
    })
    DLMusic.stderr.on('data', (data)=>{
      console.error(`stderr: ${data}`)
      res.send(`Error: ${data}`);
      return
    })
    DLMusic.on('close', (code)=>{
      console.log(`yt-dlp process exited with code ${code}`)
      // req.session.lastStr = req.session.output.trim().split("\n").slice(-2,-1)[0]
      req.session.filePath = req.session.output.trim().split("\n").slice(-2,-1)[0].substring(targetString.length)
      console.log(`抽出データー: ${req.session.filePath}`)
      res.redirect("/send");
      return
      // delete req.session.ouput
      // filePath = "/app/public/bb1fb0facf769d730600254116a5ccce4a6c0f1756788fda142f063cd1802aa3/Orangestar - キミノヨゾラ哨戒班 (Official MV).mp3"
      // if(filePath){
      //   const readStream = fs.createReadStream(filePath);
      //   readStream.on('open', ()=>{
      //     res.writeHead(200, {
      //       'Content-Type': 'audio/mpeg',
      //       'Transfer-Encoding': 'chunked'
      //     });
      //     readStream.pipe(res);
      //   });
      //   readStream.on('error', (err)=>{
      //     res.statusCode = 500;
      //     res.end(`Server Error: ${err.message}`)
      //   })
      // }
    });
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Server listening on port ${process.env.PORT || 8080}`);
});
