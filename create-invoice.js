const fs = require("fs");
const PDFDocument = require("pdfkit");

function createInvoice(invoice, path) {
	let doc = new PDFDocument({ size: "A4", margin: 50 });
	doc.info["Title"] =
		invoice.company_name + " - Invoice - " + invoice.order_date;
	generateHeader(doc, invoice.company_name);
	generateCustomerInformation(doc, invoice);
	generateInvoiceTable(doc, invoice);
	generateFooter(doc);
	doc.end();
	doc.pipe(fs.createWriteStream(path));
	return doc;
}

function generateHeader(doc, company_name) {
	doc.image("./assets/images/logo.png", 50, 45, { width: 50 })
		.fillColor("#444444")
		.fontSize(20)
		.text(company_name, 110, 57)
		.fontSize(10)
		.text(company_name, 200, 50, { align: "right" })
		.text("28/1, Phase-3", 200, 65, { align: "right" })
		.text("Naroda GIDC, Ahmedabad, Gujarat", 200, 80, {
			align: "right",
		})
		.moveDown();
}

function generateCustomerInformation(doc, invoice) {
	doc.fillColor("#444444").fontSize(20).text("Invoice", 50, 160);

	generateHr(doc, 185);

	let customerInformationTop = (customerInformationTop1 = 200);

	doc.fontSize(10);
	if (invoice.invoice_nr) {
		doc.text("Invoice Number:", 50, customerInformationTop)
			.font("Helvetica-Bold")
			.text(invoice.invoice_nr, 150, customerInformationTop)
			.font("Helvetica");
	} else customerInformationTop -= 15;
	doc.text("Invoice Date:", 50, customerInformationTop + 15)
		.text(invoice.order_date, 150, customerInformationTop + 15)
		.text("Balance Due:", 50, customerInformationTop + 30)
		.text(formatCurrency(invoice.due), 150, customerInformationTop + 30)

		.font("Helvetica-Bold")
		.text(invoice.party_details.party_name, 300, customerInformationTop1)
		.font("Helvetica")
		.text(
			invoice.party_details.phone_number,
			300,
			customerInformationTop1 + 15
		)
		.moveDown();

	generateHr(doc, customerInformationTop + 52);
}

function generateInvoiceTable(doc, invoice) {
	let i;
	let invoiceTableTop = 300;

	doc.font("Helvetica-Bold");
	generateTableRow(
		doc,
		invoiceTableTop,
		"Item",
		"Unit Cost",
		"Quantity",
		"Line Total"
	);
	invoiceTableTop += 20;
	generateHr(doc, invoiceTableTop);
	doc.font("Helvetica");

	for (i = 0; i < invoice.items.length; i++) {
		const item = invoice.items[i];
		invoiceTableTop += 15;
		generateTableRow(
			doc,
			invoiceTableTop,
			item.name,
			formatCurrency(item.price),
			item.qty,
			formatCurrency(item.total)
		);
		invoiceTableTop += 20;

		generateHr(doc, invoiceTableTop);
		if (invoiceTableTop > 750) {
			doc.addPage();
			invoiceTableTop = 40;
		}
	}

	const subtotalPosition = invoiceTableTop + 30;
	doc.font("Helvetica-Bold");
	generateTableRow(
		doc,
		subtotalPosition,
		"",
		"",
		"Subtotal",
		formatCurrency(invoice.subtotal)
	);
	doc.font("Helvetica");
}

function generateFooter(doc) {
	doc.fontSize(10).text(
		"Payment is due within 15 days. Thank you for your business.",
		50,
		780,
		{ align: "center", width: 500 }
	);
}

function generateTableRow(
	doc,
	y,
	item,
	// description,
	unitCost,
	quantity,
	lineTotal
) {
	doc.fontSize(10)
		.text(item, 50, y)
		.text(unitCost, 280, y, { width: 90, align: "right" })
		.text(quantity, 370, y, { width: 90, align: "right" })
		.text(lineTotal, 0, y, { align: "right" });
}

function generateHr(doc, y) {
	doc.strokeColor("#aaaaaa")
		.lineWidth(1)
		.moveTo(50, y)
		.lineTo(550, y)
		.stroke();
}

function formatCurrency(cents) {
	return "Rs. " + cents;
}

module.exports = {
	createInvoice,
};
