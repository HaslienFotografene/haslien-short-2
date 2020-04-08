const mongoose = require("mongoose");
const Int32 = require("mongoose-int32");

const db = mongoose.createConnection(process.env.DB_STRING, {
	useFindAndModify: false,
	useNewUrlParser: true,
	useUnifiedTopology: true
}, err => {
	if (err) {
		db.removeAllListeners();
		console.error("Could not connect to MongoDB: ", err);
		throw err;
	} else {
		console.info("Connected to MongoDB.");
	}
});

db.on("close", () => {
	console.log("Closed DB.");
	db.removeAllListeners();
});
module.exports.db = db;

const urlSchema = new mongoose.Schema({
	url: String,
	dest: String,
	desc: String,
	created: Date,
	modified: Date,
	user: String,
	password: String,
	flags: Int32
}, { collection: "shortUrls" });
const urlModel = db.model("urlModel", urlSchema);
module.exports.urlModel = urlModel;