const router = require("express").Router();
const fs = require("fs");

const homeButton = `<br><br><a href="/"><button>Return to Home</button></a>`;

router.get("/checkauth", async (req, res) => {
	client
		.getState()
		.then((data) => {
			console.log(data);
			res.send(data + homeButton);
		})
		.catch((err) => {
			if (err) {
				res.send("DISCONNECTED");
				// try {
				// 	fs.unlinkSync("session.json");
				// } catch (err) {
				// 	console.log(err);
				// }
			}
		});
});

router.get("/getqr", (req, res) => {
	var qrjs = fs.readFileSync("routes/qrcode.js");

	fs.readFile("routes/last.qr", (err, last_qr) => {
		fs.readFile("session.json", (serr, sessiondata) => {
			if (err && sessiondata) {
				res.write(
					`<html><body><h2>Already Authenticated</h2>${homeButton}</body></html>`
				);
				res.end();
			} else if (!err && serr) {
				var page = `
                    <html>
                        <body>
                            <script>${qrjs}</script>
                            <div id="qrcode"></div>
                            ${homeButton}
                            <script type="text/javascript">
                                new QRCode(document.getElementById("qrcode"), "${last_qr}");
                            </script>
                        </body>
                    </html>
                `;
				res.write(page);
				res.end();
			}
		});
	});
});

module.exports = router;
