const mongoose = require("mongoose");
const Int32 = require("mongoose-int32");
// Development: mongodb://10.0.0.73:27017/urlshort?replicaSet=rs0
// Production: process.env.DB_STRING

const db = mongoose.createConnection(process.env.NODE_ENV ==="development" ? "mongodb://10.0.0.73:27017/urlshort?replicaSet=rs0" : process.env.DB_STRING, {
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
	url: {
		required: [true, "Missing short URL"],
		maxlength: [100, "Short URL can only be max 100 characters"],
		type: String
	},
	dest: {
		require: [true, "Missing redriect destination URL"],
		type: String
	},
	desc: {
		maxlength: [400, "Description can max be 400 characters"],
		type: String
	},
	created: Date,
	modified: Date,
	uses: Number,
	passphrase: {
		maxlength: [100, "Passphrases can only be max 100 characters long"],
		type: String
	},
	users: [{
		username: String,
		password: String,
		flags: Int32
	}],
	flags: Int32
}, { collection: "shortUrls" });
const urlModel = db.model("urlModel", urlSchema);
module.exports.urlModel = urlModel;

const accessLogSchema = new mongoose.Schema({
	path: String,
	destination: String,
	origin: String,
	ip: String,
	notFound: Boolean,
	user: String,
	queryStrings: [Object],
	shortId: {
		ref: "urlModel",
		type: String
	},
	userAgent: String,
	location: {
		country: String,
		continent: String,
		region: String,
		city: String
	}
}, {collection: "accessLog"});
const accessLog = db.model("accessLog", accessLogSchema);
module.exports.accessLog = accessLog;