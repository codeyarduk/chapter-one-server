const express = require("express");
const router = express.Router();
const verifyGoogleToken = require("../middleware/auth");
const jwtDecode = require("jwt-decode");
const { User } = require("./users");

router.post("/", verifyGoogleToken, async (req, res) => {
  //   res.send("Hello World");
  //   console.log("Hello world");
  //   console.log(req.headers.authorization);
  const resData = jwtDecode.jwtDecode(req.headers.authorization);
  const email = resData.email;
  //   console.log(email);

  try {
    const user = await User.findOne({
      email: email,
    });
    res.send(user.reviews);
    console.log(user.reviews);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
