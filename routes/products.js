var express = require("express");
const CONFIG = require("../config");
var router = express.Router();
const productDB = CONFIG.DB.products;

router.get("/", async function (req, res) {
	const docs = await productDB.find({}).sort({ status: -1, name: 1 });
	if (!docs) {
		req.session.error = "Error getting Product Details";
		return res.redirect("/");
	}
	let response = {
		products: docs,
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
	res.render("products/view-products", response);
});

router.get("/add", async function (req, res) {
	const response = {
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	res.render("products/add-product", response);
});

router.post("/add", async function (req, res) {
	const { _id } = req.body;

	if (_id) {
		const result = await productDB.update(
			{ _id },
			{ $set: { name: req.body.name, price: req.body.price } }
		);
		if (!result) req.session.error = "Error getting Old Product Details";
		else req.session.success = "Product Edited Successfully";
	} else {
		req.body.status = "true";
		req.body.stock = 0;
		const result = await productDB.insert(req.body);
		if (!result) req.session.error = "Error Adding Product Details";
		else req.session.success = "Product Added Successfully";
	}
	return res.redirect("../");
});

router.get("/edit/:id", async function (req, res) {
	const result = await productDB.findOne({ _id: req.params.id });
	if (!result) {
		req.session.error = "Error getting Product Details";
		return res.redirect("../");
	}
	const response = {
		product: result,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	res.render("products/add-product", response);
});

router.get("/delete/:id", async function (req, res) {
	const result = await productDB.update(
		{ _id: req.params.id },
		{ $set: { status: "false" } }
	);
	if (!result) req.session.error = "Error getting Product Details";
	else req.session.success = "Product Status Changed Successfully";
	return res.redirect("../");
});

router.get("/active/:id", async function (req, res) {
	const result = await productDB.update(
		{ _id: req.params.id },
		{ $set: { status: "true" } }
	);
	if (!result) req.session.error = "Error getting Product Details";
	else req.session.success = "Product Status Changed Successfully";
	return res.redirect("../");
});

router.post("/addstock/:id", async function (req, res) {
	const result = await productDB.update(
		{ _id: req.params.id },
		{ $inc: { stock: parseInt(req.body.stock) } }
	);
	if (!result) req.session.error = "Error Adding Stock";
	else req.session.success = "Stock Added Successfully";
	return res.redirect("../");
});

module.exports = router;
