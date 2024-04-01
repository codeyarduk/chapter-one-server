let express = require("express");
let router = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const { OAuth2Client } = require("google-auth-library");

async function getUserData(access_token) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=" +
      access_token
  );
  const data = await response.json();
  console.log(data);
}

router.get("/", async (req, res) => {
  const code = request.query.code;
  try {
    const redirectUrl = "http://127.0.0.1.3000/oauth";
    const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUrl
      );
      const res = await client.getToken(code);
      await client.setCredentials(res.tokens);
      console.log('Tokens acquired');
      const user = client.credentials;
      console.log(user);
      await getUserData(user.access_token);
  } catch {
    console.error('Error acquiring tokens');
  }
});

module.exports = router;