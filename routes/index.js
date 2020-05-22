const router = require("express").Router();
const config = require("../config.json");
const Statistics = require("../util/Statistics");

// The root path
router.get("/", async (req,res) => {
	// res.redirect(config.defaultRedirect);
	
	let stats = new Statistics(config.defaultRedirect);
	
	stats.inc();
	stats.log(stats.ipFromReq(req), "/", req.headers["user-agent"], req.header("Referer"), stats.toArray(req.query))

	// return res.redirect(config.defaultRedirect);
	res.end("INDEX");
});

module.exports = router;

