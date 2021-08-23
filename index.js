var express = require("express");
let CONFIG = require("./config");
var bodyParser = require("body-parser");
const fs = require("fs");

var app = express();

app.use(express.static("./assets"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require("cors")());
app.use(require("cookie-parser")());
app.use(
	require("express-session")({
		secret: "djhxcvxfgshajfgjhgsjhfgsakjeauytsdfy",
		resave: false,
		saveUninitialized: true,
	})
);

process.on("unhandledRejection", (err, p) => {
	console.log(`[ERROR]: ${err}`);
});

app.set("view engine", "ejs");

app.use(function (req, res, next) {
	if (
		!(
			req.path.includes("css") ||
			req.path.includes("png") ||
			req.path.includes("ico")
		)
	)
		console.log(req.method + " : " + req.path);
	next();
});

app.listen(CONFIG.PORT, () => {
	console.log(`[INFO] : App listening at http://localhost:${CONFIG.PORT}`);
});

app.use("/products", require("./routes/products"));
app.use("/party", require("./routes/party"));
app.use("/invoice", require("./routes/invoice"));
// app.use("/wa", require("./whatsapp-init"));

(async () => {
	let date = new Date();
	const current_month = date.toLocaleString("en-US", { month: "short" });
	const current_year = date.getFullYear();
	// fetch the month from the invoiceDB file
	const singleInvoice = await CONFIG.DB.invoices.findOne({});
	let file_month = "",
		file_year = "";
	if (singleInvoice) {
		file_month = new Date(singleInvoice.order_date);
		file_year = file_month.getFullYear();
		file_month = file_month.toLocaleString("en-US", { month: "short" });
	}
	if (
		file_month !== "" &&
		(file_month !== current_month || file_year !== current_year)
	) {
		console.log("[INFO] : Changing the current month in the database");
		fs.mkdir(`./db/${file_month} - ${file_year}`, function (err) {
			if (err) {
				console.log(err);
			} else {
				const moveFile = (folder_path, file_name) => {
					var oldPath = `${folder_path}/${file_name}`;
					var newPath = `${folder_path}/${file_month} - ${file_year}/${file_name}`;

					fs.rename(oldPath, newPath, function (err) {
						if (err) throw err;
						console.log(
							`[INFO] : Successfully moved - ${file_name}!`
						);
					});
				};
				moveFile("./db", "invoices.db");
				moveFile("./db", "party_logs.db");
			}
		});
	}
})();

String.prototype.toProperCase = function () {
	return this.replace(
		/\w\S*/g,
		(txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
	);
};

app.get("/", (req, res) => {
	// set the current month if not set in the session
	if (!req.session.current_month)
		req.session.current_month = new Date().toLocaleString("en-US", {
			month: "short",
		});

	if (!req.session.current_year)
		req.session.current_year = new Date().getFullYear();

	if (!req.session.change) req.session.change = false;

	const response = {
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	if (req.session.error) {
		response.result = { status: "error", message: req.session.error };
		delete req.session.error;
	} else if (req.session.success) {
		response.result = { status: "success", message: req.session.success };
		delete req.session.success;
	}
	// console.log(response);
	res.render("dashboard", response);
});

if (!fs.existsSync("./db")) {
	fs.mkdirSync("./db");
}
if (!fs.existsSync("./invoices")) {
	fs.mkdirSync("./invoices");
}

app.get("/:month/:year?", (req, res) => {
	const Datastore = require("nedb-promises");
	const monthsArray = {
		Jan: 1,
		Feb: 2,
		Mar: 3,
		Apr: 4,
		May: 5,
		Jun: 6,
		Jul: 7,
		Aug: 8,
		Sep: 9,
		Oct: 10,
		Nov: 11,
		Dec: 12,
	};
	let { month: input_month, year: input_year } = req.params;
	if (input_month.toLowerCase() === "reset") {
		delete req.session.current_month;
		delete req.session.current_year;
		delete req.session.change;
	} else if (!input_month.includes("ico")) {
		input_month = input_month.toProperCase();
		if (!monthsArray[input_month]) {
			req.session.error = "Invalid month";
			return res.redirect("/reset");
		}
		// check if the month is current month or not
		const date = new Date();
		const current_month = date.toLocaleString("en-US", { month: "short" });
		const current_year = date.getFullYear();
		if (!input_year) input_year = current_year;
		// console.log(current_month);
		// console.log(input_month);
		// console.log(monthsArray[current_month]);
		// console.log(monthsArray[input_month]);
		if (
			input_year == current_year &&
			monthsArray[input_month] > monthsArray[current_month]
		)
			input_year = current_year - 1;

		if (!(input_month === current_month && input_year === current_year))
			req.session.change = true;
		else return res.redirect("/reset");
		// set the current month in the session
		if (!fs.existsSync("./db/" + input_month + " - " + input_year)) {
			req.session.error = `Data does not exixts for the ${input_month} ${input_year}`;
			return res.redirect("/reset");
		}
		req.session.current_month = input_month;
		req.session.current_year = input_year;
	}

	return res.redirect("/");
});
