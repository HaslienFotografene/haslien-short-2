const bcrypt = require("bcryptjs");
// const got = require("got");
const { accessLog, urlModel } = require("./Database");
const config = require("../config.json");
const assert = require("assert");
const jwt = require("jsonwebtoken");

class RouteHandler {
	/**
	 * Creates a short-url handler
	 * @param {String} route The route user is attempting to use
	 * @returns {Promise<RouteHandler>}
	 */
	constructor(route="/") {
		/**
		 * The path the person is accessing
		 * @property {String} route
		 */
		this.route = route.toLowerCase();

		/**
		 * The access log model
		 * @property {Model} logModel
		 */
		this.logModel = accessLog;

		/**
		 * The Short ID model
		 * @property {Model} urlModel
		 */
		this.urlModel = urlModel;

		/**
		 * GOT request util
		 * @property {Function} got
		 */
		// this.got = got;

		/**
		 * The short URL document
		 * @property {Object} doc
		 * @abstract
		 */
		this.doc = null;

		/**
		 * The configuration for routes
		 * @property {Object} config
		 */
		this.config =  {
			flags: config.flags,
			saltLength: 15, // Changing this will invalidate all passwords
			fields: [		// Fields possible in a URL document
				"url",
				"dest",
				"passphrase",
				"phrases",
				"user",
				"frame"
			]
		};

		/**
		 * The JSON Web Token middleware
		 * @property {Function} _jwt
		 */
		this._jwt = jwt;

		/**
		 * The Crypto middleware
		 * @property {Function} bcrypt
		 */
		this.bcrypt = bcrypt;

		/**
		 * Assertion middleware
		 * @property {Function} assert
		 */
		this.assert = assert;

		return this._load();
	}

	/**
	 * Auto-populate the document
	 * @returns {Promise<RouteHandler>}
	 */
	async _load() {
		this.doc = await this.urlModel.findOne({url: this.route});
		return this;
	}

	/**========================================
	 * 		Public getters
	 **========================================*/

	/**
	 * Check if a match was found
	 * @returns {Boolean}
	 */
	get exist() {
		return !!this.doc;
	}

	/**
	 * Check if this document is deprecated
	 * @returns {Boolean}
	 */
	get deprecated() {
		return !!(this.config.flags.deprecated & this.doc.flags);
	}

	/**
	 * Check if this endpoint require passphrase
	 * @returns {Boolean}
	 */
	get passphraseRequired() {
		return !!(this.config.flags.passphrase & this.doc.flags);
	}

	/**
	 * Check if this endpoint require username + password
	 * @returns {Boolean}
	 */
	get loginRequired() {
		return !!(this.config.flags.login & this.doc.flags);
	}

	/**
	 * The destination this path is supposed to take you
	 * @returns {String}
	 */
	get destination() {
		return this.doc.dest;
	}

	/**
	 * This route should be embedded
	 * @returns {boolean}
	 */
	get frame() {
		return !!(this.config.flags.frame & this.doc.flags);
	}


	/* *========================================
	 * 		Public methods
	 **========================================*/

	/**
	 * Verifies if the JWT is intact and valid. Returns decoded value if true.
	 * @param {String} token The token to validate
	 * @returns {Object|Boolean}
	 * @static
	 * @public
	 */
	static verifyToken(token) {
		try {
			return jwt.verify(token, process.env.JWT_TOKEN);
		} catch(_) {
			return false;
		}
	}

	static renderToken(token) {
		try {
			return jwt.decode(token);
		} catch(_) {
			return false;
		}
	}


	/**
	 * Creates an authorization based JWT
	 * @param {object} data The base data
	 * @param {string} primary A primary authorization phrase (passphrase or username)
	 * @param {string} [secondary] A secondary authorization phrase (password if login)
	 * @returns {string}
	 * @static
	 * @public
	 */
	static makeAuthedJWT(data, primary, secondary) {
		data.primary = primary;
		if (secondary) data.secondary = secondary;

		delete data.iat;
		delete data.exp;

		return jwt.sign(data,
			process.env.JWT_TOKEN, {
			expiresIn: 60 * 15
		});
	}

	/**
	 * Creates a JWT for the current path
	 * @param {String} type A string defining what type of login is expected
	 * @param {string} accessId A document in the DB linked to accessing of this page
	 * @returns {String}
	 */
	jwt(type, accessId=null) {
		return this._jwt.sign({
			path: this.route,
			a: accessId,
			type: type,
			flags: this.doc.flags||0
		},
			process.env.JWT_TOKEN, {
			expiresIn: 60 * 15
		});
	}

	/**
	 * Hashes a password for storage
	 * @param {String} password The password to hash
	 * @returns {String} Hashed password
	 */
	hashPassword(password) {
		let salt = this.bcrypt.genSaltSync(10);
		password = bcrypt.hashSync(password, salt);
		return password;
	}

	/**
	 * Compates password with hash
	 * @param {String} pwHash The hashed password from DB
	 * @param {String} pwPlain The password as plaintext
	 * @returns {Boolean}
	 */
	comparePassword(pwHash, pwPlain) {
		return this.bcrypt.compareSync(pwPlain, pwHash);
	}

	/**
	 * Creates a new login object for a document
	 * @param {String} username The new username
	 * @param {String} password The new password as plaintext
	 * @param {Number} [flags=0] Flags associated with account
	 * @returns {Object} {err:N, object:{username, password, flags}}
	 */
	newLogin(username, password, flags=0) {
		password = this.hashPassword(password);

		/**
		 * Here validation can be done of the account
		 */

		return {
			err: 0,
			result: {
				username: username,
				password: password,
				flags: flags
			}
		};
	}

	/**
	 * @typedef {object} requestObject
	 * @prop {string} dest The destination URL
	 * @prop {striung} url The URL user will go to in order to end up at {@link this.dest}
	 * @prop {string} [desc=null] An internal note what this short URL is used for
	 * @prop {string} [passphrase=null] An optional password phrase user enter in order to proceed following URL
	 * @prop {string} [user.username] A username user will have to use to proceed following URL
	 * @prop {string} [user.password] A password to follow the username
	 * @prop {boolean} [frame=false] Put this URL behind an iframe. Useful for PW protected destinations, but destination page require frame permission.
	 */
	/**
	 * Creates a new URL based on request object
	 * @param {requestObject}
	 */
	newUrl({
		dest,
		url,
		desc=null,
		passphrase=null,
		user=null,
		frame=false
	}) {
		// Determine flag based on input
		let flag = passphrase ? this.config.flags.passphrase : 0;
		flag += user ? this.config.flags.login : 0;
		flag += frame ? this.config.flags.frame : 0;

		let doc = new this.urlModel({
			url: url,
			dest: dest,
			desc: desc,
			created: new Date(),
			modified: new Date(),
			uses: 0,
			passphrase,
			users: user ? [user] : [],
			flags: flag
		});

		// Perform document validation
		// -> Assign errors to errs variable
		let errs = doc.validateSync();
		if (errs) {
			try {
				// No errors as expectation
				// -> Check every field has no error.
				//	 -> Else throw error, using the error itself
				this.assert(errs.errors[key], false, errs.errors[key]);
			} catch (err) {
				return {
					err: 1,
					result: errs.errors[Object.keys(errs.errors)[0]].message
				};
			}
		}

		return {
			err: 0,
			result: doc.toObject()
		};
	}

	/**
	 * Inserts the document in to the short URL database
	 * @param {Object} shortUrlDoc A complete short URL document
	 * @returns {Promise<Boolean>}
	 */
	async store(shortUrlDoc) {
		this.urlModel.create(shortUrlDoc, () => {
			return true;
		});
	}

	/**
	 * Declassify a URL document
	 * @param {Object} document The URL document to declassify
	 * @returns {Object}
	 */
	declassify(document) {

		// Strip out password and ID
		if (document.users && document.users.length) {
			document.users.forEach((_,i) => {
				delete document.users[i]._id;
				delete document.users[i].password;
			});
		}

		return document;
	}

	/**
	 * Normalize/validate data from API request
	 * @param {Object} object The data payload to normalize and validate
	 * @returns {Object}
	 */
	normalizeNew(object) {
		// 'url' and 'dest' is validated by Mongoose
		if(object.constructor.name!=="Object") return {
			err: 1,
			result: "Data must be an object"
		};

		for(let key in object) {
			// Strip away 
			if (!this.config.fields.includes(key)) {
				delete this.config.fields[key];
			}
		}

		if (object.user) {
			if(!object.user.username) return {
				err: 1,
				result: "Missing username in ?user parameter"
			};
			if (!object.user.password) return {
				err: 1,
				result: "Missing password in ?user parameter"
			};
			if (object.user.flags) {
				if (isNaN(object.user.flags) || !Number.isInteger(parseInt(object.user.flags))) return {
					err: 1,
					result: "Flags must be an integer"
				};
				if(parseInt(object.user.flags) < 0) return {
					err: 1,
					result: "Flags cannot be a negative number"
				};
			}
		}

		return {
			err: 0,
			result: object
		};
	}

	/**
	 * Check if the login provided is still valid
	 * @param {string} path The path they are trying to access
	 * @param {string} primary The primary phrase
	 * @param {string} [secondary] The secondary phrase
	 * @returns {Promise<boolean>}
	 */
	async authorize(path, primary, secondary) {
		if (!path || !primary) throw new Error("Missing path or primary");

		let query = {url: path.toLowerCase()}
		// query.secondary = this.hashPassword(secondary);

		// If username + PW
		if (secondary) {
			query["users.username"] = { $in: [primary] }
			let doc = await this.urlModel.findOne(query, ["users.$"]);

			if (!doc) return false;

			// Compare passwords
			if (!this.comparePassword(doc.users[0].password, secondary)) return false;
			return true;
		}

		query.passphrase = primary;
		let doc = await this.urlModel.findOne(query, ["passphrase"]);

		if (!doc) return false;
		return true;
	}
}

module.exports = RouteHandler;