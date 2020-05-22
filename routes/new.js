const router = require("express").Router();
const config = require("../config.json");
const Statistics = require("../util/Statistics");
const RouteHandler = require("../util/RouteHandler");
const passport = require("passport");
const { token } = require("../util/Passport");

router.post("/", passport.authenticate(token, {session:false}), async (req, res) => {
	let handler = await new RouteHandler(req.body.url);

	// Normalize and validate data
	let result = handler.normalizeNew(req.body);
	if (result.err) {
		return res.status(400).json({
			err_client: true,
			err_internal: false,
			message: result.result,
			data: null
		});
	}

	// If it is occupied
	if (handler.exist) return res.status(409).json({
		err_client: true,
		err_internal: false,
		message: "This path is already taken.",
		data: null
	});

	// Deconstruct
	result = result.result;

	// Create new user if applicable
	if(result.user) {
		result.user = handler.newLogin(result.user.username, result.user.password, result.user.flags);
		if (result.user.err) {
			return res.status(400).json({
				err_client: true,
				err_internal: false,
				message: result.user.result,
				data: null
			});
		}

		result.user = result.user.result;
	}

	//  Create new URL document
	result = handler.newUrl(result);

	if (result.err) {
		return res.status(400).json({
			err_client: true, 
			err_internal: false, 
			message: result.result,
			data: null
		});
	}

	// Save the document
	await handler.store(result.result);

	// Strip sensitive information and return document
	return res.status(201).json({
		err_client: false,
		err_internal: false,
		message: "Success.",
		data: handler.declassify(result.result)
	});
});

module.exports = router;

// passworded