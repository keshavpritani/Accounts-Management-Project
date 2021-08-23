var express = require("express");
const CONFIG = require("../config");
var router = express.Router();
const partyDB = CONFIG.DB.party;
const productDB = CONFIG.DB.products;
const partyLogDB = CONFIG.DB.party_logs;

// Database Schema

// {
// 	"_id":"ZSHfyVKOhZomCMHH",
// 	"name":"Keshav Pritani",
// 	"phone_number":"9724426259",
// 	"products":[
// 	   {
// 		  "product_id":"VLsxkvN9uYTE4UCA",
// 		  "price":"100"
// 	   },
// 	   {
// 		  "product_id":"zGSGXOfFzrEjAR5L",
// 		  "price":"2000"
// 	   }
// 	],
// 	"due":"3000"
//}

router.get("/", async function (req, res) {
	const docs = await partyDB.find({}).sort({ due: -1 });
	if (!docs) {
		req.session.error = "Error getting Party Details";
		return res.redirect("/");
	}
	let response = { party: docs };
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
	const docs = await productDB.find({ status: "true" });
	if (!docs) {
		req.session.error = "Error getting Party Details";
		return res.redirect("./");
	}
	res.render("party/add-party", { products: docs });
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
	req.body.due = 0;

	if (_id) {
		// get the balance due of the party
		const party = await partyDB.findOne({ _id });
		if (!party) {
			req.session.error = "Party not found";
			return res.redirect("./");
		}
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
	const products = await productDB.find({ status: "true" });
	if (!products) {
		req.session.error = "Error getting Product Details";
		return res.redirect("../");
	}
	response = {
		party: doc,
		products: products,
	};
	res.render("party/add-party", response);
});

router.get("/delete/:id", async function (req, res) {
	const result = partyDB.remove({ _id: req.params.id });
	// delete all the invoice entries of the party from invoiceDB
	const invoiceDB = CONFIG.DB.invoices;
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
	console.log(req.body);
	const { party_id, amount } = req.body;
	const party = await partyDB.findOne({ _id: party_id });
	if (!party) {
		req.session.error = "Party not found";
		return res.redirect("../");
	}
	const newDue = parseFloat(party.due) - parseFloat(amount);
	if (newDue < 0) {
		req.session.error = "Payment amount is greater than due amount";
		return res.redirect("../");
	}
	const result = await partyDB.update(
		{ _id: party_id },
		{ $set: { due: newDue } }
	);
	// add payment log to the party_log file
	const log = {
		party_name: party.name,
		amount: amount,
		date: new Date(),
	};
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
	const docs = await partyLogDB.find({}).sort({ date: -1 });
	if (!docs) {
		req.session.error = "Error getting Party Logs Details";
		return res.redirect("./");
	}

	let response = { logs: docs };
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

module.exports = router;
