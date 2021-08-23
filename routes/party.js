var express = require("express");
const Datastore = require("nedb-promises");
const CONFIG = require("../config");
var router = express.Router();
const partyDB = CONFIG.DB.party;
const productDB = CONFIG.DB.products;
let partyLogDB = CONFIG.DB.party_logs;
const invoiceDB = CONFIG.DB.invoices;

router.get("/", async function (req, res) {
	const docs = await partyDB.find({}).sort({ due: -1 });
	if (!docs) {
		req.session.error = "Error getting Party Details";
		return res.redirect("/");
	}
	let response = {
		party: docs,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	if (req.session.error) {
		response.result = { status: "error", message: req.session.error };
		delete req.session.error;
	} else if (req.session.success) {
		response.result = {
			status: "success",
			message: req.session.success,
		};
		delete req.session.success;
	}
	res.render("party/view-party", response);
});

router.get("/add", async function (req, res) {
	const docs = await productDB.find({ status: "true" }).sort({ name: 1 });
	if (!docs) {
		req.session.error = "Error getting Party Details";
		return res.redirect("./");
	}
	const response = {
		products: docs,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	res.render("party/add-party", response);
});

router.post("/add", async function (req, res) {
	const { _id, products, prices } = req.body;
	// merge products and prices into one array of objects
	const productObjects = products.map(function (product, index) {
		return {
			product_id: product,
			price: prices[index],
		};
	});
	const arrayUniqueByKey = [
		...new Map(
			productObjects.map((item) => [item["product_id"], item])
		).values(),
	];
	// console.log(arrayUniqueByKey);
	delete req.body.products;
	delete req.body.prices;
	req.body.products = arrayUniqueByKey;

	let result;
	req.body.opening_balance = req.body.due = 0;

	if (_id) {
		// get the balance due of the party
		const party = await partyDB.findOne({ _id });
		if (!party) {
			req.session.error = "Party not found";
			return res.redirect("./");
		}
		req.body.opening_balance = party.opening_balance;
		req.body.due = party.due;
		result = await partyDB.update({ _id }, req.body);
	} else result = await partyDB.insert(req.body);

	if (!result) req.session.error = "Error Adding/Updating Party Details";
	else if (_id) req.session.success = "Party Edited Successfully";
	else req.session.success = "Party Added Successfully";
	return res.redirect("./");
});

router.get("/edit/:id", async function (req, res) {
	const doc = await partyDB.findOne({ _id: req.params.id });
	if (!doc) {
		req.session.error = "Error getting Party Details";
		return res.redirect("../");
	}
	const products = await productDB.find({ status: "true" }).sort({ name: 1 });
	if (!products) {
		req.session.error = "Error getting Product Details";
		return res.redirect("../");
	}
	response = {
		party: doc,
		products: products,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	res.render("party/add-party", response);
});

router.get("/delete/:id", async function (req, res) {
	const result = partyDB.remove({ _id: req.params.id });
	// delete all the invoice entries of the party from invoiceDB
	const invoices = await invoiceDB.find({ party_id: req.params.id });
	if (invoices) {
		invoices.forEach(async (invoice) => {
			await invoiceDB.remove({ _id: invoice._id });
		});
	}
	if (!result) req.session.error = "Error getting Party Details";
	else req.session.success = "Party Deleted Successfully";
	return res.redirect("../");
});

// Add the payment to the party and update the due
router.post("/payment/:id", async function (req, res) {
	// console.log(req.body);
	let { party_id, amount } = req.body;
	const party = await partyDB.findOne({ _id: party_id });
	if (!party) {
		req.session.error = "Party not found";
		return res.redirect("../");
	}
	const log = {
		party_id: party_id,
		party_name: party.name,
		date: new Date(),
	};
	if (amount < 0) {
		log.diff = true;
		amount = -amount;
	}
	log.amount = amount;
	const result = await partyDB.update(
		{ _id: party_id },
		{
			$set: {
				due: (parseFloat(party.due) - parseFloat(amount)).toFixed(2),
			},
		}
	);
	// add payment log to the party_log file
	const logResult = await partyLogDB.insert(log);

	if (!result || !logResult) {
		req.session.error = "Error adding payment";
		return res.redirect("../");
	}
	if (!result) req.session.error = "Error Updating Party Details";
	else req.session.success = "Payment Added Successfully";
	return res.redirect("../");
});

router.get("/logs", async function (req, res) {
	const current_date = new Date();
	const current_month = current_date.toLocaleString("en-US", {
		month: "short",
	});
	const current_year = current_date.getFullYear();
	if (
		req.session.current_month &&
		(current_month !== req.session.current_month ||
			current_year !== req.session.current_year)
	) {
		partyLogDB = require("nedb-promises").create(
			`./db/${req.session.current_month} - ${req.session.current_year}/party_logs.db`
		);
	} else partyLogDB = require("nedb-promises").create(`./db/party_logs.db`);
	const docs = await partyLogDB.find({}).sort({ date: -1 });
	if (!docs) {
		req.session.error = "Error getting Party Logs Details";
		return res.redirect("./");
	}

	let response = {
		logs: docs,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	if (req.session.error) {
		response.result = { status: "error", message: req.session.error };
		delete req.session.error;
	} else if (req.session.success) {
		response.result = {
			status: "success",
			message: req.session.success,
		};
		delete req.session.success;
	}
	res.render("party/view-party-logs", response);
});

// Get the Ledger of the party
router.get("/ledger/:id", async function (req, res) {
	const party = await partyDB.findOne({ _id: req.params.id });
	if (!party) {
		req.session.error = "Party not found";
		return res.redirect("../");
	}
	invoiceDB.persistence.compactDatafile();
	let invoices = await invoiceDB.find({ party_id: req.params.id });
	if (!invoices) {
		req.session.error = "Error getting Invoice Details";
		return res.redirect("../");
	}

	// party logs
	const partyLogs = await partyLogDB.find({ party_id: req.params.id });

	let balance = -parseFloat(party.opening_balance);
	// get the total amount of every invoice
	invoices = invoices.map((invoice) => {
		balance -= parseFloat(invoice.total);
		return { date: invoice.order_date, total: invoice.total };
	});
	// merger innvoices and party logs and sort by date descending
	const merged = invoices.concat(partyLogs).sort((a, b) => {
		return new Date(a.date) - new Date(b.date);
	});

	balance += partyLogs.reduce(
		(acc, cur) => acc + Math.abs(parseFloat(cur.amount)),
		0.0
	);

	let debitB, creditB;
	if (balance > 0) {
		creditB = balance;
	} else {
		debitB = -balance;
	}

	const response = {
		opening_balance: party.opening_balance,
		logs: merged,
		party_name: party.name,
		debitB,
		creditB,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	// res.json(response);
	res.render("party/view-party-ledger", response);
});

module.exports = router;
