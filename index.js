var express = require("express");
const CONFIG = require("./config");
var bodyParser = require("body-parser");

const currentMonthDB = CONFIG.DB.current_date;

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

app.get("/error-500", (req, res) => {
	res.status(500).render("page-error-500");
});

app.use("/products", require("./routes/products"));
app.use("/party", require("./routes/party"));
app.use("/invoice", require("./routes/invoice"));
// app.use("/", require("./whatsapp-init"));

// check the currentMonthDb file whether it matchs the current month or not if not then change the current month in the file
// and also change the current month in the database
(async () => {
	let date = new Date();
	const current_month = date.toLocaleString("en-US", { month: "short" });
	// console.log(current_month);
	const file_month = await currentMonthDB.findOne({});
	// console.log(file_month );
	if (file_month.month !== current_month) {
		console.log("[INFO] : Changing the current month in the database");
		date.setMonth(date.getMonth() - 1);
		const prev_month = date.toLocaleString("en-US", { month: "short" });
		currentMonthDB.update({}, { month: current_month });
		let fs = require("fs");
		const year = date.getFullYear();
		fs.mkdir(`./db/${prev_month} - ${year}`, function (err) {
			if (err) {
				console.log(err);
			} else {
				const moveFile = (folder_path, file_name) => {
					var oldPath = `${folder_path}/${file_name}`;
					var newPath = `${folder_path}/${prev_month} - ${year}/${file_name}`;

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

app.get("/", (req, res) => {
	const response = {
		current_month: req.session.current_month,
		current_year: req.session.current_year,
	};
	if (req.session.error) {
		response.result = { status: "error", message: req.session.error };
		delete req.session.error;
	} else if (req.session.success) {
		response.result = { status: "success", message: req.session.success };
		delete req.session.success;
	}
	console.log(response);
	res.render("dashboard", response);
});

app.get("/:month/:year?", (req, res) => {
	const { month, year } = req.params;
	// set the current month in the session
	req.session.current_month = month;
	req.session.current_year = year;

	res.redirect("/");
});
