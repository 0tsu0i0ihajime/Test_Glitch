const express = require("express"),
    session = require("express-session"),
    bodyParser = require("body-parser"),
    path = require("path"),
    cookieParser = require("cookie-parser"),
    fs = require("fs"),
    { spawn } = require("child_process"),
    crypto = require("crypto"),
    http = require("http");

let users = JSON.parse(fs.readFileSync("pass.json", "utf8"));
let tar_URL = "https://www.google.com";
const app = express();

fs.watch("pass.json", (event, filename) => {
    if (event === "change") {
        console.log(`${filename}change!`);
        users = JSON.parse(fs.readFileSync("pass.json", "utf8"));
    }
});

app.use(
    session({
        secret: "My Secret Key: Common",
        resave: false,
        saveUninitialized: true,
    })
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!username && !password) {
        res.send(
            `<body>Please enter a username and password<br><a href="${tar_URL}">Visit Login Form</a></body>`
        );
        return;
    }

    if (username && password) {
        if (users[username] === password) {
            req.session.username = username;
            const uniqueKey = `${username}:${password}`;
            const sessionID = crypto
                .createHash("sha256")
                .update(uniqueKey)
                .digest("hex");
            res.cookie("sessionId", sessionID);
            res.sendFile(path.join(__dirname, "public", "stream.html"));
        } else {
            res.redirect("/");
            return;
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
    if (!req.session.filePath) {
        res.redirect("/stream");
        return;
    } else {
        const path = req.session.filePath;
        res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>audio</title>
    </head>
    <body>
        <audio id="audioPlayer" controls>
            <source src="./${path}" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>
        <script>
            const audioPlayer = document.getElementById('audioPlayer');
            audioPlayer.onended = ()=>{
                fetch('/song-end', {method: "POST"})
                    .then(res => res.text())
                    .then(data => {
                        const messageDiv = document.createElement('div');
                        messageDiv.innerHTML = data;
                        document.body.appendChild(messageDiv)
                    })
            }
        </script>
    </body>
    </html>
    `);
    };
}
);

app.get("/play", (req, res) => {
    const targetString = "[ExtractAudio] Destination: ";
    const url = req.session.url;
    const { sessionId } = req.cookies;
    req.session.output = [];
    const checkInfo = spawn("python3", ["info.py", url]);
    checkInfo.stdout.on("data", (data) => {
        console.log(data.toString());
        req.session.output += data.toString();
    });
    checkInfo.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
        res.send(`Error: ${data}`);
        return;
    });
    checkInfo.on("exit", () => {
        req.session.lastLine = req.session.output.trim().split("\n").pop();
        if (!fs.existsSync(`public/${sessionId}`)) {
            fs.mkdirSync(`public/${sessionId}`);
        }
        fs.writeFileSync(
            `public/${sessionId}/data.json`,
            JSON.stringify(req.session.lastLine)
        );
        req.session.Number = 0;
        delete req.session.url;
        delete req.session.output;
        const args = [
            "-o",
            `public/${sessionId}/%(title)s.%(ext)s`,
            "--extract-audio",
            "--audio-format",
            "mp3",
            JSON.parse(req.session.lastLine.replace(/'/g, '"'))[req.session.Number],
        ];
        const DLMusic = spawn("yt-dlp", args);
        DLMusic.stdout.on("data", (data) => {
            req.session.output += data.toString();
            console.log(`stdout: ${data}`);
        });
        DLMusic.stderr.on("data", (data) => {
            console.error(`stderr: ${data}`);
            res.send(`Error: ${data}`);
            return;
        });
        DLMusic.on("close", (code) => {
            console.log(`yt-dlp process exited with code ${code}`);
            req.session.filePath = req.session.output
                .trim()
                .split("\n")
                .slice(-2, -1)[0]
                .substring(targetString.length);
            console.log(`抽出データー: ${req.session.filePath}`);
            res.redirect("/send");
            return;
        });
    });
});

app.listen(process.env.PORT || 8080, () => {
    console.log(`Server listening on port ${process.env.PORT || 8080}`);
});
