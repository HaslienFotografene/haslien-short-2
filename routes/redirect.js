const router = require("express").Router();
const config = require("../config.json");
const Statistics = require("../util/Statistics");
const RouteHandler = require("../util/RouteHandler");

router.get("/:url", async (req,res) => {
	if (req.params.url === "favicon.ico") return res.status(404).end();

	let handler = await new RouteHandler(req.params.url);
	let stats = new Statistics(req.params.url, handler && handler.doc && handler.doc.id ? handler.doc.id : null);

	// If the route wasn't found
	if (!handler.exist) {
		res.redirect(config.defaultRedirect);
		stats.inc();
		stats.log(stats.ipFromReq(req), req.params.url, req.headers["user-agent"], req.header("Referer"), stats.toArray(req.query), !handler.exist);
		return;
	}

	stats.inc();
	stats.log(stats.ipFromReq(req), req.params.url, req.headers["user-agent"], req.header("Referer"), stats.toArray(req.query), !handler.exist);

	// Check if requiring higher level first:
	// - require Username + Password:
	if (handler.loginRequired) {
		// Makes API call to Auth, which then handle redirects.
		return res.render("auth/login", { token: handler.jwt("login") });
	}

	// Check if requiring higher level first:
	// - require password:
	if (handler.passphraseRequired) {
		// Makes API call to Auth, which then handle redirects.
		return res.render("auth/password", { token: handler.jwt("password") });
	}

	// If frame, go to frame endpoint instead
	if (handler.frame) {
		return res.render("frame", { token: handler.jwt("frame"), url: handler.doc.dest });
	}

	// Else normal redirect
	res.redirect(handler.destination);
	return;
});

module.exports = router;