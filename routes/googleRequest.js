let express = require("express");
let router = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const { OAuth2Client } = require("google-auth-library");

router.post("/googleRequest", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Referrer-Policy", "no-referrer-when-downgrade");

  const redirectUrl = "http://127.0.0.1:3000/oauth";
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl
  );
  const authoriseUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.openid",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    prompt: "consent",
  });
  res.json({ authoriseUrl });
});

module.exports = router;