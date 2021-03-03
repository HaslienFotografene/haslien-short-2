const router = require("express").Router();
const ListHandler = require("../util/ListHandler");
const passport = require("passport");
const { token } = require("../util/Passport");

router.delete("/:url", passport.authenticate(token, {session:false}), async (req, res) => {
	try {
		const handler = new ListHandler();

		if (!await handler.checkExist(req.params.url)) return res.status(404).json({
			err_client: true,
			err_internal: false,
			message: "No short URL '"+req.params.url+"' exist",
			data: null
		});

		// Delete
		const urlData = handler.getPath(req.params.url);
		await handler.deletePath(req.params.url);

		// Result
		return res.json({
			err_client: false,
			err_internal: false,
			message: "URL '"+req.params.url+"' deleted",
			data: urlData
		});
	} catch(err) {
		console.error(err);
		return res.status(401).end();
	}
});

module.exports = router;