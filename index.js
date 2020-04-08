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

app.use(helmet());
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.json({ limit: "5mb" }));

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
app.set("trust proxy", 1);

app.get("/", (req,res) =>{
	return res.redirect("https://www.haslien.no");
})

app.get("/:url", (req,res) => {
	try {
		urlModel.findOne({url: req.params.url.toLowerCase()})
			.then(r=>{
				console.log(r);
				if(!r) return res.redirect("https://www.haslien.no");
		
				return res.redirect(r.dest);
			})
	} catch(err) {
		return res.redirect("https://www.haslien.no");
	}
});

// Any page
app.get("*", (req, res) => {
	return res.redirect("https://www.haslien.no");
});

const port = process.env.PORT||config.backupPort;
app.listen(port, console.debug(`Url shortener started @ ${port}`));