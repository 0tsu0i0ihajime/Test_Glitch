const express = require('express');
const session = require('express-session');
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const { spawn } = require("child_process");
const redis = require('redis')
const RedisStore = require('connect-redis')(session);

let tar_URL = "https://www.google.com";
const app = express();
const redisClient = redis.createClient(process.env.REDIS_URL)

app.use(
  session({
    store: new RedisStore({client:redisClient}),
    secret: "My Secret Key: Common",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
redisClient.HSET('users', 'admin', 'password', (err, reply)=>{
  console.log(reply)
})

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if(!username&&!password){
    res.send(`<body>Please enter a username and password<br><a href="${tar_URL}">Visit Login Form</a></body>`);
    return
  }
  redisClient.get(username, (err, Redispassword)=>{
    if(err){
      res.send(`<body>login error=Invalid username or password<br><a href="${tar_URL}">Visit Login Form</a></body>`);
      console.log(err)
      return
    }else if(Redispassword===password){
      res.send('一致')
      return
    }else{
      res.send('エラー')
      return
    }
  })

  if (username && password) {
    if (username === "admin" && password === "password") {
      req.session.username = username;
      res.cookie("sessionId", req.session.id);
      res.sendFile(path.join(__dirname, "public", "stream.html"));
    }
  }
});

app.post("/stream", (req, res) => {
  const { sessionId } = req.cookies;
  if (!sessionId || !req.session.username) {
    // res.redirect("/");
    res.send("データが足りない");
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

app.get("/play", (req, res) => {
  const url = req.session.url;
  const { sessionId } = req.cookies;
  const checkInfo = spawn("python3", ["info.py", url]);
  checkInfo.stdout.on("data", (data) => {
    console.log(data.toString());
    req.session.output += data.toString();
  });
  checkInfo.stdout.on("end", () => {
    req.session.lastLine = req.session.output.trim().split("\n").pop();
    if (!fs.existsSync(sessionId)) {
      fs.mkdirSync(sessionId);
    }
    fs.writeFileSync(`${sessionId}/data.json`, JSON.stringify(req.session.lastLine))
    req.session.Number = 0;
    delete req.session.url
    delete req.session.output
    const DLMusic = spawn("python3", [
      `yt-dlp --output ${sessionId}/` + '%(title)s' + ` --extract-audio --audio-format mp3 ${req.session.lastLine[req.session.Number]
      }`,
    ]);
    res.send('Time')
    return
    // res.send(req.session.lastLine)
    console.log("End");
  });
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Server listening on port ${process.env.PORT || 8080}`);
});
