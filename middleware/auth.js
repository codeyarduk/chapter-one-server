// /middleware/auth.js

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(
  "886756526696-8pc6lu70409d3uu0jvfkojk02kjoak7t.apps.googleusercontent.com"
);

// const ticket = await client.verifyIdToken({
//     idToken: token,
//     audience:
//       "886756526696-8pc6lu70409d3uu0jvfkojk02kjoak7t.apps.googleusercontent.com", // Specify the CLIENT_ID of the app that accesses the backend
//   });

async function verifyGoogleToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: authHeader,
      audience:
        "886756526696-8pc6lu70409d3uu0jvfkojk02kjoak7t.apps.googleusercontent.com",
    });

    req.userId = ticket.getPayload().sub;
    next();
  } catch (err) {
    res.status(401).send('Unauthorized');
  }
}

module.exports = verifyGoogleToken;
