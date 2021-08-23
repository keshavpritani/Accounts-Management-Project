const Datastore = require("nedb-promises");
module.exports = {
	PORT: process.env.PORT || 3000,
	DB: {
		products: Datastore.create("./db/products.db"),
		party: Datastore.create("./db/party.db"),
		party_logs: Datastore.create("./db/party_logs.db"),
		invoices: Datastore.create("./db/invoices.db"),
	},
};
