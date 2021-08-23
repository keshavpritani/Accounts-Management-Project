const CONFIG = require("../config");
const axios = require("axios");
TWILIO_SID = CONFIG.TWILIO_CREDS.SID;
TWILIO_TOKEN = CONFIG.TWILIO_CREDS.TOKEN;
SERVICE_SID = CONFIG.TWILIO_CREDS.SERVICE_ID;
const client = require("twilio")(TWILIO_SID, TWILIO_TOKEN);
const { exec } = require("child_process");

// twilio plugins:install @twilio-labs/plugin-assets
// twilio assets:init --service-name my-cool-assets-service
if (result1.rows[0].confirm) {
	// await axios.delete(
	// 	`https://serverless.twilio.com/v1/Services/my-cool-assets-service`,
	// 	{
	// 		auth: {
	// 			username: TWILIO_SID,
	// 			password: TWILIO_TOKEN,
	// 		},
	// 	}
	// );
	// send request to twillio for fetching all the assets through axios, also need to pass the sid and key
	const all_assets = await axios
		.get(
			`https://serverless.twilio.com/v1/Services/${SERVICE_SID}/Assets`,
			{
				auth: {
					username: TWILIO_SID,
					password: TWILIO_TOKEN,
				},
			}
		)
		.catch((err) => {
			req.session.error = CONFIG.ERROR_RES;
			return res.redirect("/error-500");
		});

	// console.log(all_assets.data.assets);
	// find the assets id from the all_assets.data.assets array

	const checkFileName = (fileName, no) => {
		for (let i = 0; i < all_assets.data.assets.length; i++) {
			if (
				all_assets.data.assets[i].friendly_name ===
					no + "_" + fileName ||
				(no === 0 &&
					all_assets.data.assets[i].friendly_name === filename)
			) {
				return checkFileName(fileName, no + 1);
			}
		}
		if (no === 0) return filename;
		return no + "_" + fileName;
	};
	filename = checkFileName(filename, 0);
}
const command = `twilio assets:upload ${file_path} -o json`;
console.log("Uploading the invoice");
exec(command, async (error, stdout, stderr) => {
	// console.log(`stdout: ${stdout}`);
	const url = JSON.parse(stdout)[0].url;
	await client.messages
		.create({
			from: "whatsapp:+14155238886",
			body: `Your Kisbis Food Industries Company order of ${result2.rows.length} item(s) has shipped and should be delivered on time soon. Details: ${url}`,
			to: `whatsapp:+91${phone_number}`,
		})
		.catch((err) => console.log(err));
});
