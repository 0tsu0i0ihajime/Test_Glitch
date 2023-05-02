const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fs = require("fs");
const { spawn } = require("child_process");

let tar_URL = "https://www.google.com";
const app = express();
// const args = {
//     '-x': '--audio-format mp3',
//     '--output': '%(title)s.mp3'
// }
// const check_opts = '--simulate'
const playlist_link = "--dump-json";

app.use(
  session({
    secret: "My Secret Key: Common",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username && password) {
    if (username === "admin" && password === "password") {
      req.session.username = username;
      res.cookie("sessionId", req.session.id);
      res.sendFile(path.join(__dirname, "public", "stream.html"));
    } else {
      res.send(
        '<body>login error=Invalid username or password<br><a href="' +
          tar_URL +
          '">Visit Login Form</a></body>'
      );
    }
  } else {
    res.send(
      '<body>Please enter a username and password<br><a href="' +
        tar_URL +
        '">Visit Login Form</a></body>'
    );
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
    return
  }
  req.session.url = url
  res.redirect("/play");
});

app.get("/play", (req, res) => {
  const url = req.session.url;
  const { sessionId } = req.cookies;
  let output = '';
  const checkInfo = spawn("python3", ["info.py", url]);
  checkInfo.stdout.on("data", (data)=>{
    output += data.toString();
  });
  checkInfo.stdout.on("end", ()=>{
    console.log(output);
    res.send(output)
    return
  });
  // const ytDlpProcess = spawn("yt-dlp", playlist_link, url);

  // ytDlpProcess.stdout.on("data", (data) => {
  //   const output = data.toString();
  //   if (output.inCludes('"_type": "playlist"')) {
  //     req.session.link = [];
  //     console.log(`This is a playlist: ${url}`);
  //     const info = JSON.parse(output);
  //     const entries = info.entries;
  //     for (const entry of entries) {
  //       req.session.link.push(entry.webpage_url);
  //     }
  //     console.log(req.session.link);
  //   }
  // });
  // res.render('play.ejs', { url: url });
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Server listening on port ${process.env.PORT || 8080}`);
});
