const config = require("../config.json");
const passport = require("passport");
const TokenStrategy = require("passport-http-bearer").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const { urlModel } = require("./Database");
const RouteHandler = require("./RouteHandler");

/**
 * Login strategy for passphrase protected endpoints
 * @param {String} path The path users is attempting to authenticate
 * @param {String} passphrase The passphrase (case sensitive) to validate
 * @param {Function} cb Function to execute if successful
 */
const passphrase = new LocalStrategy({
	usernameField: "username",
	passwordField: "passphrase",
	session: false,
	passReqToCallback: true
}, async (req, _, passphrase, cb) => {
	try {
		// Missing token
		if (!req.body.token) return cb(null, false);

		let data = RouteHandler.verifyToken(req.body.token);

		// Token is invalid
		if (!data) return cb(null, false);

		let doc = await urlModel.findOne({url: data.path.toLowerCase(), passphrase: passphrase}, ["dest"]);
	
		// No document
		if (!doc) return cb(null, false);

		return cb(null, doc);
	} catch (err) {
		return cb(err);
	}
});
module.exports.passphrase = passphrase;

/**
 * Login strategy for username + password endpoints
 * @param {String} username The path users is attempting to authenticate
 * @param {String} password The password (case sensitive) to validate
 * @param {Function} cb Function to execute if successful
 */
const login = new LocalStrategy({
	usernameField: "username",
	passwordField: "password",
	session: false,
	passReqToCallback: true
}, async (req, username, password, cb) => {
	try {
		// Missing token
		if (!req.body.token) return cb(null, false);
		
		let data = RouteHandler.verifyToken(req.body.token);
		
		let handler = await new RouteHandler(req.params.url);

		// Token is invalid
		if (!data) return cb(null, false);

		let doc = await urlModel.findOne({ url: data.path, "users.username":{$in:[username]} }, ["dest", "users.$"]);

		// No document
		if (!doc) return cb(null, false);

		// Compare passwords
		if (!handler.comparePassword(doc.users[0].password, password)) return cb(null, false);

		/**
		 * In the future flags and stuff can be checked here.
		 */

		return cb(null, doc);
	} catch (err) {
		return cb(err);
	}
});
module.exports.login = login;


/**
 * A very simple API token auth, using direct comparison with ENV variable
 * @param {String} token The token to check
 * @param {Function} cb The callback function
 */
const token = new TokenStrategy((token, cb) => {
	if (token===process.env.API_TOKEN) return cb(null, true);
	return cb(null, false);
});
module.exports.token = token;