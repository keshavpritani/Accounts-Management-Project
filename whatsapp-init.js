var express = require("express");
var router = express.Router();
const { Client } = require("whatsapp-web.js");
const SESSION_FILE_PATH = "./session.json";
const fs = require("fs");

let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
	sessionCfg = require(SESSION_FILE_PATH);
}

global.client = new Client({
	puppeteer: {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--unhandled-rejections=strict",
		],
	},
	session: sessionCfg,
});

global.authed = false;

client.on("qr", (qr) => {
	fs.writeFileSync("./routes/last.qr", qr);
});

client.on("authenticated", (session) => {
	console.log("AUTH!");
	sessionCfg = session;

	fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
		if (err) {
			console.error(err);
		}
		authed = true;
	});

	try {
		fs.unlinkSync("./routes/last.qr");
	} catch (err) {}
});

client.on("auth_failure", () => {
	console.log("AUTH Failed !");
	fs.unlinkSync("./session.json");
	sessionCfg = "";
});

client.on("ready", () => {
	console.log("Client is ready!");
});

client.initialize();

router.use("/chat", require("./routes/chatting"));
router.use("/auth", require("./routes/auth"));

module.exports = router;
