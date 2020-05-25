require("dotenv").config();
const express = require("express");
const app = express();
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const config = require("./config.json");
require("./util/Database");
global.mainFolder = path.resolve(__dirname);
const { urlModel } = require("./util/Database");
const crypto = require("crypto");

app.use(helmet());
app.engine("html", require("ejs").renderFile);
app.set("views", path.join("./views"));		
app.set("view engine", "html");
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.json({ limit: "5mb" }));
// Random JWT for every restart
process.env.JWT_TOKEN = crypto.randomBytes(30).toString("hex");

// Generic error catching
app.use((err, req, res, next) => {
	if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
		return res.status(400).json({
			err_internal: false,
			err_client: true,
			message: "Invalid body/payload",
			data: null
		});
	}
	next();
});
app.set("trust proxy", true);

// app.use("/", require("./routes/index"));
app.use("/.auth", require("./routes/auth"));
app.use("/.new", require("./routes/new"));
app.use("/.frame", require("./routes/frame"));
app.use("/.list", require("./routes/list"));
app.get("/:url", require("./routes/redirect"));

app.get("/", (req,res) =>{
	return res.redirect(config.defaultRedirect);
});

// app.get("/:url", (req,res) => {
// 	try {
// 		urlModel.findOne({url: req.params.url.toLowerCase()})
// 			.then(r=>{
// 				console.log(r);
// 				if(!r) return res.redirect(config.defaultRedirect);
		
// 				return res.redirect(r.dest);
// 			})
// 	} catch(err) {
// 		return res.redirect(config.defaultRedirect);
// 	}
// });

// Any page
app.get("*", (req, res) => {
	return res.redirect(config.defaultRedirect);
});

const port = process.env.PORT||config.backupPort;
app.listen(port, console.debug(`Url shortener started @ ${port}`));