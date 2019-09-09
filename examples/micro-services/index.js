const express = require("express")
const pkg = require("./package.json")

delete pkg.scripts

const app = express()

app.get("/health", (req, res) => res.json({status:"ok"}));
app.get("/", (req, res) => res.json(pkg));
app.get("/version", (req, res) => res.json(pkg.version));

app.listen(pkg.port, () => {
  console.log(`App running on http://0.0.0.0:${pkg.port}`);
})
