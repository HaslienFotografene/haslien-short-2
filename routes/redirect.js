const router = require("express").Router();
const config = require("../config.json");
const Statistics = require("../util/Statistics");
const RouteHandler = require("../util/RouteHandler");

router.get("/:url", async (req,res) => {
	try {
		if (req.params.url === "favicon.ico") return res.status(404).end();
		if (Object.keys(req.query).length) return res.status(401).end();
		if (/^([a-zA-Z0-9-_])+$/.test(req.params.url)===false) return res.status(401).end();

		let rq = req.params.url.toString().toLowerCase();
	
		let handler = await new RouteHandler(rq);
		let stats = new Statistics(rq, handler && handler.doc && handler.doc.id ? handler.doc.id : null);
	
		// If the route wasn't found
		if (!handler.exist) {
			res.redirect(config.defaultRedirect);
			stats.inc();
			stats.log(stats.ipFromReq(req), rq, req.headers["user-agent"], req.header("Referer"), stats.toArray(req.query), !handler.exist);
			return;
		}
	
		stats.inc();
		let statDoc = await stats.log(stats.ipFromReq(req), rq, req.headers["user-agent"], req.header("Referer"), stats.toArray(req.query), !handler.exist);
	
		// Check if requiring higher level first:
		// - require Username + Password:
		if (handler.loginRequired) {
			// Makes API call to Auth, which then handle redirects.
			return res.render("auth/login", { token: handler.jwt("login", statDoc._id) });
		}
	
		// Check if requiring higher level first:
		// - require password:
		if (handler.passphraseRequired) {
			// Makes API call to Auth, which then handle redirects.
			return res.render("auth/password", { token: handler.jwt("password", statDoc._id) });
		}
	
		// If frame, go to frame endpoint instead
		if (handler.frame) {
			return res.render("frame", { token: handler.jwt("frame", statDoc._id), url: handler.doc.dest });
		}
	
		// Else normal redirect
		res.redirect(handler.destination);
		return;
	} catch (err) {
		console.error(err);
		return res.status(401).end();}
});

module.exports = router;