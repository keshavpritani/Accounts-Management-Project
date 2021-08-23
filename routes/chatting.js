const router = require("express").Router();
const { MessageMedia } = require("whatsapp-web.js");
const request = require("request");
const vuri = require("valid-url");
const fs = require("fs");

const mediadownloader = (url, path, callback) => {
	request.head(url, (err, res, body) => {
		request(url).pipe(fs.createWriteStream(path)).on("close", callback);
	});
};

router.post("/sendpdf/:phone", async (req, res) => {
	var base64regex =
		/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

	let phone = req.params.phone;
	let pdf = req.body.pdf;

	if (phone == undefined || pdf == undefined) {
		res.send({
			status: "error",
			message: "please enter valid phone and base64/url of pdf",
		});
	} else {
		if (base64regex.test(pdf)) {
			let media = new MessageMedia("application/pdf", pdf);
			client.sendMessage(`${phone}@c.us`, media).then((response) => {
				if (response.id.fromMe) {
					res.send({
						status: "success",
						message: `MediaMessage successfully sent to ${phone}`,
					});
				}
			});
		} else if (vuri.isWebUri(pdf)) {
			if (!fs.existsSync("./temp")) {
				await fs.mkdirSync("./temp");
			}

			var path = "./temp/" + pdf.split("/").slice(-1)[0];
			mediadownloader(pdf, path, () => {
				let media = MessageMedia.fromFilePath(path);
				client.sendMessage(`${phone}@c.us`, media).then((response) => {
					if (response.id.fromMe) {
						res.send({
							status: "success",
							message: `MediaMessage successfully sent to ${phone}`,
						});
						fs.unlinkSync(path);
					}
				});
			});
		} else {
			res.send({
				status: "error",
				message: "Invalid URL/Base64 Encoded Media",
			});
		}
	}
});

module.exports = router;
