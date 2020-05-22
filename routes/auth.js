const router = require("express").Router();
const passport = require("passport");
const RouteHandler = require("../util/RouteHandler");
const { login, passphrase } = require("../util/Passport");

// Login POST location
router.post("/login", passport.authenticate(login, {session:false}), async (req,res) => {
	if (!req.body.username || !req.body.password || !req.body.token) return res.status(401).json({
		err_client: true,
		err_internal: false,
		message: "Missing authorization payload.",
		data: null
	});

	// Deconstruct and verify token
	const t = RouteHandler.verifyToken(req.body.token);

	// Verify token
	if (!t) {
		return res.status(401).json({
			err_client: true,
			err_internal: false,
			message: "Invalid token.",
			data: null
		});
	}

	const handler = await new RouteHandler(t.path);
	if (!handler.exist) return res.status(410).json({
		err_client: true,
		err_internal: false,
		message: "URL endpoint removed.",
		data: null
	});

	if (handler.frame) {
		// Add login to the token, which is used on reload to remain authorizaed
		let token = RouteHandler.makeAuthedJWT(t, req.body.username, req.body.password);
		return res.json({ redirect: `/.frame/?token=${token}` });
	}

	return res.json({ redirect: handler.destination });
});


// Passphrase POST location
router.post("/passphrase", passport.authenticate(passphrase, {session:false}), async (req,res) => {
	// Deconstruct and verify token
	const t = RouteHandler.renderToken(req.body.token);

	// Verify token
	if (!t) {
		return res.status(401).json({
			err_client: true,
			err_internal: false,
			message: "Invalid token.",
			data: null
		});
	}

	const handler = await new RouteHandler(t.path);
	if (!handler.exist) return res.status(410).json({
		err_client: true,
		err_internal: false,
		message: "URL endpoint removed.",
		data: null
	});

	if (handler.frame) {
		// Add login to the token, which is used on reload to remain authorizaed
		let token = RouteHandler.makeAuthedJWT(t, req.body.passphrase);
		return res.json({ redirect: `/.frame/?token=${token}` });
	}

	return res.json({ redirect: handler.destination });
});

module.exports = router;