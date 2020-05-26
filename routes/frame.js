const RouteHandler = require("../util/RouteHandler");
const router = require("express").Router();

router.get("/", async (req,res) => {
	try {
		if (!req.query.token) return res.render("error/missing-token");
		let t = RouteHandler.verifyToken(req.query.token);
	
		if (!t) {
			t = RouteHandler.renderToken(req.query.token);
			if (!t) return res.render("error/invalid-token", {link: false});
			return res.render("error/invalid-token", { link: `/${t.path}` });
		}
	
		// Populate route
		const handler = await new RouteHandler(t.path);
		if (!handler.exist) return res.render("error/no-longer-exist", {link: `/${t.path}`});
	
		// Authorize login in the token
		if (!await handler.authorize(t.path, t.primary, t.secondary)) {
			// If not authorized, tell them that resource doesn't exist.
			return res.render("error/no-longer-exist", {link: `/${t.path}`});
		}
	
		return res.render("frame", {url: handler.destination});
	} catch(err) {
		console.error(err);
		return res.status(401).end();
	}
});

module.exports = router;