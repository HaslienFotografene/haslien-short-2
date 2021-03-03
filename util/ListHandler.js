const config = require("../config.json");
const { accessLog, urlModel } = require("./Database");

module.exports = class ListHandler {
	constructor () {
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
	}

	/**
	 * Validates a number like
	 * @param {string|number} num The number to check
	 * @returns {number|object}
	 */
	_validNum(num) {
		if (isNaN(num) || !Number.isInteger(parseInt(num))) return {
			err: 1,
			result: "Invalid number."
		}

		return parseInt(num);
	}
	
	/**
	 * Get a list of all short URLs
	 * @param {number} [limit=1000] Max number of documents to return
	 * @param {number} [offset=0] Offset number from start, for pagingation
	 * @returns {Promise<Array<Object>>}
	 */
	async getAll(limit=1000, offset=0) {
		limit = this._validNum(limit);
		if (limit.err) return limit;
		offset = this._validNum(offset);
		if (offset.err) return offset;

		let d = await this.urlModel.aggregate([
			{$skip: offset},
			{$limit:limit}
		]);

		return {
			err: 0,
			result: d
		}
	}

	/**
	 * Gets all information on a specific path
	 * @param {string} path The short URL path to get
	 * @returns {Promise<model>}
	 */
	async getPath(path) {
		if (!path) throw new Error("Missing path to get");

		return await this.urlModel.findOne({url: path.toLowerCase()});
	}

	/**
	 * Checks if a path exist or not
	 * @param {string} path The short URL path to check
	 * @returns {Promise<boolean>}
	 */
	async checkExist(path) {
		let d = await this.urlModel.find({url: path.toLowerCase()}, ["_id"]).limit(1);
		return !!d.length;
	}

	/**
	 * Checks if a destination exist or not
	 * @param {string} path The URL destination to check
	 * @returns {Promise<boolean>}
	 */
	async destExist(path) {
		let d = await this.urlModel.find({ dest: path.toLowerCase() }, ["_id"]).limit(1);
		return !!d.length;
	}

	/**
	 * Get the access logs of a specific path
	 * @param {string} path The short URL path to get
	 * @param {number} [limit=50] Max number of documents to return
	 * @param {number} [offset=0] Offset number from start, for pagingation
	 * @returns {Promise<Array<Object>>}
	 */
	async getLogs(path, limit=50, offset=0) {
		limit = this._validNum(limit);
		if (limit.err) return limit;
		offset = this._validNum(offset);
		if (offset.err) return offset;

		let d = await this.logModel.aggregate([
			{$match: {path: path.toLowerCase()}},
			{$skip: offset},
			{$limit:limit}
		]);

		return {
			err: 0,
			result: d
		}
	}

	/**
	 * Get all access logs
	 * @param {string} path The short URL path to get
	 * @param {number} [limit=100] Max number of documents to return
	 * @param {number} [offset=0] Offset number from start, for pagingation
	 * @returns {Promise<Array<Object>>}
	 */
	async getAllLogs(path, limit=100, offset=0) {
		limit = this._validNum(limit);
		if (limit.err) return limit;
		offset = this._validNum(offset);
		if (offset.err) return offset;

		let d = await this.logModel.aggregate([
			{ $skip: offset },
			{ $limit: limit }
		]);

		return {
			err: 0,
			result: d
		}
	}

	/**
	 * Permanently deletes a path
	 * @param {String} path
	 * @returns {Promise<Object>}
	 */
	deletePath(path) {
		return this.urlModel.deleteOne({path: path.toLowerCase()}).exec();
	}
};