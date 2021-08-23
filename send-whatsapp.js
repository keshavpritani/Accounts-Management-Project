// TWILIO

const client = require("twilio")(
	"AC2fedf28fa102e4cdd08965891051f16e",
	"1ac3712f61b7b48d22f917fab578b3e5"
);
client.balance.fetch().then(function (data) {
	console.log(data);
});

// client.messages
// 	.create({
// 		from: "whatsapp:+14155238886",
// 		// local pdf file
// 		// mediaUrl: ".\index.js",
// 		// body: "Ahoy world!",
// 		to: "whatsapp:+919724426259",
// 	})
// 	.then((message) => console.log(message.sid))
// 	.catch((err) => console.log(err));

// VONAGE

// const axios = require("axios");

// axios.post(
// 	"https://messages-sandbox.nexmo.com/v0.1/messages",
// 	{
// 		from: { type: "whatsapp", number: "14157386170" },
// 		to: { type: "whatsapp", number: "919724426259" },
// 		message: {
// 			content: {
// 				type: "text",
// 				text: "message",
// 			},
// 		},
// 	},
// 	{
// 		auth: {
// 			username: "21b396af",
// 			password: "mcq7t7oKizdC533f",
// 		},
// 	}
// );
