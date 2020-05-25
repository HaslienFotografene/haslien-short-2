const got = require("got");
const {accessLog, urlModel} = require("./Database");

class Statistics {
	constructor(route, docId=null) {
		/**
		 * Configuration
		 * @property {Object} config
		 */
		this.config = {
			save: true,
			log: false
		};

		/**
		 * The path the person is accessing
		 * @property {String} route
		 */
		this.route = route;

		/**
		 * The short URL document ID
		 * @property {String} docId
		 */
		this.docId = docId;

		/**
		 * The accesslog model
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
		 * IP location finder
		 * @property {Object} iplocate
		 */
		this.iplocate = {
			"api": "https://apility-io-ip-geolocation-v1.p.rapidapi.com",
			"token": "250049c7f3mshb0e1dc36569db47p15de43jsn47b477580fc6",
			"meta": "x-rapidapi-key"
		}
	}

	/**
	 * Logs a usage event. Returns save event
	 * @param {String} ip The user's IP
	 * @param {String} path The destination path to being accessed
	 * @param {String} userAgent The User Agent of the user
	 * @param {String} origin The location user got here from
	 * @param {Array<Object>} [queryStrings] A list of query strings used in the request
	 * @param {Boolean} [notFound=false] If this was a result of not finding the document
	 * @async
	 * @public
	 * @returns {Promise<Object>}
	 */
	async log(ip=null, path="/", userAgent=null, origin=null, queryStrings = [], notFound=false) {
		// req.params.url

		ip = this._anonymizeIp(ip);
		let area = null;
		// try {
		// 	if(ip) {
		// 		area = await this._ipLocation(ip)
		// 	} else area = null;
		// } catch(_){
		// 	area = null;
		// }

		let event = new this.logModel({
			path: this.route ? this.route : "/",
			origin: origin,
			shortId: this.docId ? this.docId : "root",
			notFound: notFound,
			userAgent: userAgent,
			ip: ip,
			queryStrings: queryStrings,
			location: area
		});

		if (this.config.save) {
			await event.save();
		}

		if (this.config.log) {
			console.log("Doc: %s", event.toObject());
		}

		return event.toObject();
	}

	/**
	 * Anonymize the request IP with Google's technique by removing last part.
	 * @param {String} ip The IP to anonymize
	 * @returns {String} Anonymous IP
	 * @private
	 */
	_anonymizeIp(ip) {
		if (this.config.log) console.log(ip);
		try {
			if(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
				let ipSplit = ip.split(".");
	
				if (this.config.log) {
					console.log("IP v4 split: %s", ipSplit);
				}
	
				ipSplit.pop();
				ip = ip.push("0");
				ip = ipSplit.join(".");
			} else if (/^([0-9A-Fa-f]{0,4}:){2,7}([0-9A-Fa-f]{1,4}$|((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4})$/.test(ip)) {
				let ipSplit = ip.split(":");
	
				if (this.config.log) {
					console.log("IP v6 split: %s", ipSplit);
				}
	
				ipSplit.pop();
				ipSplit = ipSplit.push("0")
				ip = ipSplit.join(":");
			}
			
			if (this.config.log) {
				console.log("IP: %s", ip);
			}
	
			return ip;
		} catch(_) {
			return ip;
		}
	}

	/**
	 * Fetch location data on an IP
	 * @param {String} ip The IP to perform geolocation on
	 * @returns {Object}
	 * @async
	 * @private
	 */
	async _ipLocation(ip) {
		try {
			let res = got(`${this.iplocate.api}/${ip}`, {
				headers: {
					[this.iplocate.meta]: this.iplocate.token
				}
			});
			res = await res.json();
			
			if (!res.ip) throw new Error("Invalid response from API");

			const obj =  {
				country: res.ip.country_names ? res.ip.country_names.en : "unknown",
				continent: res.ip.continent_names ? res.ip.continent_names.en : "uknown",
				region: res.ip.region_names ? res.ip.region_names.en : "unknown",
				city: res.ip.city_names ? res.ip.city_names.en : "unknown"
			};

			if (this.config.log) {
				console.log("Location: %s", obj);
			}

			return obj;

		} catch(err) {
			console.error(err);
			return null;
		}
	}

	/**
	 * Increase "usage" number on a Document by 1
	 * @returns {Promise<Number>}
	 */
	async inc() {
		let r;

		if(!this.docId) {
			r = await this.urlModel.findOneAndUpdate({ _id: null }, { $inc: { uses: 1 } }, { new: true, lean: true });
		} else {
			r = await this.urlModel.findOneAndUpdate({ _id: this.docId }, { $inc: { uses: 1 } }, { new: true, lean: true });
		}
		
		if (this.config.log) {
			console.log("Count: %s", r && r.count ? r.count : "None");
		}

		return r && r.count ? r.count : null;
	}

	/**
	 * Unwrap object in to array of smaller objects
	 * @param {Object} object The object to unwrap
	 * @returns {Array<Object>}
	 */
	toArray(object) {
		if(!object || !Object.keys(object).length) return null;

		return Object.keys(object).map(key => {
			return {[key]: object[key]}
		});
	}

	/**
	 * Returns an IP from the request
	 * @param {Request} req The request
	 * @returns {String|Null}
	 */
	ipFromReq(req) {
		return req.ip || req.ips[0] || req.headers['x-forwarded-for'] || null;
	}

	/**
	 * Update an entry log to attach username to this access 
	 * @param {string} docId The MongoDB document ID containing the event
	 * @param {string} username The username that accessed it
	 * @async
	 */
	async appendUser(docId, username) {
		await this.logModel.updateOne({_id: docId}, {$set:{user: username}});
		return;
	}
}

module.exports = Statistics;