const express = require("express");
const router = express.Router();

router.get("/create", async (req, res) => {
  res.send("Hello World");
});

module.exports = router;
