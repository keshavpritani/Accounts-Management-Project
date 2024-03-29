var express = require("express");
const CONFIG = require("../config");
var router = express.Router();
const { createInvoice } = require("../create-invoice");
const fs = require("fs");
const axios = require("axios");

const partyDB = CONFIG.DB.party;
const productDB = CONFIG.DB.products;
let invoiceDB = CONFIG.DB.invoices;

const checkDBFile = (session) => {
	const current_date = new Date();
	const current_month = current_date.toLocaleString("en-US", {
		month: "short",
	});
	const current_year = current_date.getFullYear();
	if (
		session.current_month &&
		(current_month !== session.current_month ||
			current_year !== session.current_year)
	) {
		invoiceDB = require("nedb-promises").create(
			`./db/${session.current_month} - ${session.current_year}/invoices.db`
		);
	} else invoiceDB = require("nedb-promises").create(`./db/invoices.db`);
};

const checkDBFile = (session) => {
	const current_date = new Date();
	const current_month = current_date.toLocaleString("en-US", {
		month: "short",
	});
	const current_year = current_date.getFullYear();
	if (
		session.current_month &&
		(current_month !== session.current_month ||
			current_year !== session.current_year)
	) {
		invoiceDB = require("nedb-promises").create(
			`./db/${session.current_month} - ${session.current_year}/invoices.db`
		);
	} else invoiceDB = require("nedb-promises").create(`./db/invoices.db`);
};

router.get("/", async function (req, res) {
	checkDBFile(req.session);
	const docs = await invoiceDB.find({}).sort({ order_date: -1 });
	// console.log(docs);
	if (!docs) {
		req.session.error = "Error getting the invoices details";
		return res.redirect("./");
	}
	// find the party details for each invoice
	for (let i = 0; i < docs.length; i++) {
		const party = await partyDB.findOne({ _id: docs[i].party_id });
		if (!party) {
			req.session.error = "Error getting the party details";
			return res.redirect("./");
		}
		docs[i].phone_number = party.phone_number;
	}

	delete docs.products;
	let response = {
		invoice: docs,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	if (req.session.error) {
		response.result = {
			status: "error",
			message: req.session.error,
		};
		delete req.session.error;
	} else if (req.session.success) {
		response.result = {
			status: "success",
			message: req.session.success,
			file_path: req.session.file_path,
		};
		delete req.session.success;
	}
	// console.log(response);
	res.render("invoice/view-invoices", response);
});

router.get("/add", async function (req, res) {
	checkDBFile(req.session);
	const docs = await partyDB.find({});
	if (!docs) {
		req.session.error = "Error getting Party Details";
		return res.redirect("./");
	}

	const products = await productDB.find({ status: "true" }).sort({ name: 1 });
	if (!products) {
		req.session.error = "Error getting Product Details";
		return res.redirect("./");
	}

	let response = {
		party: docs,
		products: products,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	res.render("invoice/add-invoice", response);
});

router.post("/add", async function (req, res) {
	let {
		_id,
		party_id,
		products,
		qtys,
		prices,
		discount,
		transportation,
		total,
	} = req.body;

	let products_obj = [];

	for (let i = 0; i < products.length; i++) {
		products_obj.push({
			product_id: products[i],
			qty: qtys[i],
			price: prices[i],
		});
	}
	productMap = new Map(
		products_obj.map((item) => [item["product_id"], item])
	);
	// To the filter out the duplicate products
	products_obj = [...productMap.values()];

	let total_price = total;

	let order_date = new Date();
	const docs = await partyDB.findOne({ _id: party_id });
	if (!docs) {
		req.session.error = "Error finding party details";
		return res.redirect("./");
	}

	if (_id) {
		const invoice = await invoiceDB.findOne({ _id: _id });
		if (!invoice) {
			req.session.error = "Error finding old invoice details";
			return res.redirect("./");
		}
		order_date = invoice.order_date;
		total_price -= invoice.total;
		const old_products = invoice.products;

		// find the difference in the quantity with the old quantity
		for (let i = 0; i < old_products.length; i++) {
			const old_product = old_products[i];
			const product = productMap.get(old_product.product_id);
			if (product) {
				const qty = parseInt(product.qty) - parseInt(old_product.qty);
				// update the product quantity in the product db
				await productDB.update(
					{ _id: old_product.product_id },
					{ $inc: { stock: -qty } }
				);
			}
		}
	}

	// decrease the qty of the products
	else
		for (let i = 0; i < products_obj.length; i++)
			await productDB.update(
				{ _id: products_obj[i].product_id },
				{ $inc: { stock: -products_obj[i].qty } }
			);

	if (total_price != 0) {
		const due = (parseFloat(docs.due) + parseFloat(total_price)).toFixed(2);
		let party_update = await partyDB.update(
			{ _id: party_id },
			{ $set: { due } }
		);
		if (!party_update) {
			req.session.error = "Error updating party due amount";
			return res.redirect("./");
		}
	}

	let invoice_obj = {
		party_id,
		party_name: docs.name,
		order_date,
		products: products_obj,
		total,
		discount,
		transportation,
	};
	// console.log(invoice_obj);
	let result;
	if (_id) result = await invoiceDB.update({ _id }, invoice_obj);
	else result = await invoiceDB.insert(invoice_obj);

	if (!result) req.session.error = "Error while committing the changes";
	else if (_id) req.session.success = "Invoice updated successfully";
	else req.session.success = "Invoice added successfully";

	return res.redirect("./");
});

router.get("/edit/:id", async function (req, res) {
	const docs = await invoiceDB.findOne({ _id: req.params.id });
	const products = await productDB.find({ status: "true" }).sort({ name: 1 });
	if (!products) {
		req.session.error = "Error getting Product Details";
		return res.redirect("../");
	}
	// add the product name to the invoice's product array
	for (let product of docs.products) {
		product["name"] = products.find(
			(p) => p._id == product.product_id
		).name;
		product["total"] = product.qty * product.price;
	}
	// console.log(docs);

	const products1 = docs.products;
	delete docs.products;

	// console.log(docs);
	// console.log(products);

	const response = {
		invoice: docs,
		products1: products1,
		products: products,
		current_month: req.session.current_month,
		current_year: req.session.current_year,
		change: req.session.change,
	};
	res.render("invoice/add-invoice", response);
});

router.get("/delete/:id", async function (req, res) {
	const id = req.params.id;
	// console.log(id);
	const docs = await invoiceDB.findOne({ _id: id });
	if (!docs) {
		req.session.error = "Error finding invoice details";
		return res.redirect("../");
	}
	// calculate the total price
	let total_price = docs.products.reduce(
		(acc, cur) => acc + parseFloat(cur.price) * parseInt(cur.qty),
		0
	);

	// get party due amount from partyDB
	const party = await partyDB.findOne({ _id: docs.party_id });
	if (!party) {
		req.session.error = "Error finding party details";
		return res.redirect("../");
	}
	// console.log(party.due - total_price);
	// decrement the party due amount
	let party_update = await partyDB.update(
		{ _id: docs.party_id },
		{ $set: { due: party.due - total_price } }
	);
	if (!party_update) {
		req.session.error = "Error updating party due amount";
		return res.redirect("../");
	}
	const result = invoiceDB.remove({ _id: id });
	if (!result) {
		req.session.error = "Error getting Invoice Details";
		return res.redirect("../");
	}
	req.session.success = "invoice Deleted Successfully";
	return res.redirect("../");
});

async function getPriceOfProduct(req, res) {
	// console.log(req.query);
	const { product_id, party_id } = req.query;

	if (party_id) {
		const doc = await partyDB.findOne({ _id: party_id });
		// console.log(doc);
		if (!doc)
			return res.json({
				result: false,
				msg: "Error getting Party Details",
			});
		// console.log(doc);
		const party_products = doc.products;
		const product = party_products.find((p) => p.product_id == product_id);
		if (product) {
			res.json({ result: true, price: product.price });
		} else {
			delete req.query.party_id;
			return getPriceOfProduct(req, res);
		}
	} else {
		const doc = await productDB.findOne({ _id: product_id });
		if (!doc)
			return res.json({
				result: false,
				msg: "Error getting Product Details",
			});
		res.json({ result: true, price: doc.price });
	}
}

// getPriceofProduct
router.get("/getPriceOfProduct", getPriceOfProduct);

function formatDate(date) {
	let dd = date.getDate();
	let mm = date.getMonth() + 1;
	let yyyy = date.getFullYear();
	if (dd < 10) {
		dd = "0" + dd;
	}
	if (mm < 10) {
		mm = "0" + mm;
	}

	return yyyy + "-" + mm + "-" + dd;
}

// confirm the invoice
router.post("/confirm/:id", async function (req, res) {
	// check if we have connected to whatsapp api or not
	/* const whatsappStatus = await axios
		.get(`http://localhost:${CONFIG.PORT}/wa/auth/checkauth`)
		.catch((err) => {
			req.session.error = "Error Getting Whatsapp Authentication";
			return res.redirect("../");
		});
	if (whatsappStatus.data.indexOf("CONNECTED") !== 0) {
		return res.redirect("/wa/auth/getqr");
	} */
	const { company_name, invoice_no } = req.body;
	let invoice = await invoiceDB.findOne({ _id: req.params.id });
	if (!invoice) {
		req.session.error = "Error getting Invoice Details";
		return res.redirect("../");
	}
	const partyObj = await partyDB.findOne({ _id: invoice.party_id });
	if (!partyObj) {
		req.session.error = "Error getting Party Details";
		return res.redirect("../");
	}
	// get the party name
	invoice.party_name = partyObj.name;
	invoice.phone_number = partyObj.phone_number;
	const allProducts = await productDB.find({ status: "true" });
	if (!allProducts) {
		req.session.error = "Error getting Product Details";
		return res.redirect("../");
	}
	const products = invoice.products;
	delete invoice.products;
	// add the product name to the invoice's product array
	for (let product of products) {
		product["name"] = allProducts.find(
			(p) => p._id == product.product_id
		).name;
		product["total"] = product.qty * product.price;
	}

	// sum of all the total of the products
	const sub_total = products.reduce((a, b) => Number(a) + Number(b.total), 0);
	const order_date = new Date(invoice.order_date);
	// const invoice_no = invoice._id;
	const bill_details = {
		party_details: {
			party_name: invoice.party_name,
			phone_number: invoice.phone_number,
		},
		items: products,
		order_date: formatDate(order_date),
		subtotal: sub_total,
		due: partyObj.due,
		invoice_nr: invoice_no,
		company_name,
	};

	// filename - Party Name - Invoice No. - Invoice Date
	let filename =
		invoice.party_name.replace(/ /g, "_") +
		"_" +
		formatDate(order_date).replace(/ /g, "_") +
		".pdf";

	file_path = "./assets/invoices/" + filename;
	const doc = createInvoice(bill_details, file_path);
	// trim the white space from the phone number
	phone_number = invoice.phone_number.replace(/\s+/g, "");
	// phone_number = "";
	if (phone_number.length == 10) {
		setTimeout(async () => {
			fs.readFile(file_path, async function (err, data) {
				if (err) throw err;
				const pdf = data.toString("base64");
				await axios
					.post(
						`http://localhost:${CONFIG.PORT}/wa/chat/sendpdf/91${phone_number}`,
						{ pdf }
					)
					.catch((err) => {
						req.session.error = "Error Sending PDF to Party";
						return res.redirect("../");
					});
			});
			req.session.success = "Bill Sent Successfully";
			return res.redirect("../");
		}, 1000);
	} else {
		req.session.success = "Bill Generated but didn't sent to the Customer";
		req.session.file_path = filename;
		return res.redirect("../");
	}
});

module.exports = router;
