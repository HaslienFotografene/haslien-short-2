const router = require("express").Router();
const config = require("../config.json");
const Statistics = require("../util/Statistics");
const ListHandler = require("../util/ListHandler");
const passport = require("passport");
const { token } = require("../util/Passport");

router.get("/", passport.authenticate(token, {session:false}), async (req,res) => {
	const handler = new ListHandler();

	let all = await handler.getAll(req.query.limit, req.query.offset);

	if (all.err) {
		return res.stauts(400).json({
			err_client:true,
			err_internal:false,
			message:all.result,
			data:null
		});
	}

	return res.json({
		err_internal: false,
		err_client: false,
		message: null,
		data: all.result
	});
});


router.get("/logs", passport.authenticate(token, { session: false }), async (req, res) => {
	const handler = new ListHandler();

	return res.json({
		err_client: false,
		err_internal: false,
		message: null,
		data: await handler.getAllLogs(req.query.limit, req.query.offset)
	});
});


router.get("/exist", passport.authenticate(token, { session: false }), async (req, res) => {
	const handler = new ListHandler();
	if (!req.query.dest) return res.status(401).end();

	if (!await handler.destExist(req.query.dest)) return res.status(404).end();
	return res.status(200).end();
});

router.get("/exist/:path", passport.authenticate(token, { session: false }), async (req, res) => {
	const handler = new ListHandler();

	if (!await handler.checkExist(req.params.path)) return res.status(404).end();
	return res.status(200).end();
});


router.get("/logs/:path", passport.authenticate(token, { session: false }), async (req, res) => {
	const handler = new ListHandler();

	if (!await handler.checkExist(req.params.path)) return res.status(404).json({
		err_client:true,
		err_internal: false,
		message: `Url '${req.params.path}' does not exist`,
		data: null
	});

	return res.json({
		err_client: false,
		err_internal: false,
		message: null,
		data: await handler.getLogs(req.params.path, req.query.limit, req.query.offset)
	});
});

router.get("/:path", passport.authenticate(token, { session: false }), async (req, res) => {
	const handler = new ListHandler();

	let data = await handler.getPath(req.params.path);

	if (!data) return res.status(404).json({
		err_internal: false,
		err_client: false,
		message: null,
		data: null
	});

	return res.json({
		err_internal: false,
		err_client: false,
		message: null,
		data: data.toObject()
	});
});

module.exports = router;