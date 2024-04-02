const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.CLIENT_ID);
const jwtDecode = require("jwt-decode");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    uses: Number,
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

router.get("/", async (req, res) => {
  const users = await User.find();
  console.log(users);
  res.send(users);
});

router.post("/", async (req, res) => {
  console.log(jwtDecode.jwtDecode(req.body.user).email);
  const resData = jwtDecode.jwtDecode(req.body.user);
  const token = req.body.user; // assuming you're sending the token in the request body

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience:
        "886756526696-8pc6lu70409d3uu0jvfkojk02kjoak7t.apps.googleusercontent.com", // Specify the CLIENT_ID of the app that accesses the backend
    });

    const payload = ticket.getPayload();
    const userid = payload["sub"];
    // If request specified a G Suite domain:
    // const domain = payload['hd'];

    console.log(payload);

    const existingUser = await User.findOne({ email: resData.email });
    if (existingUser) {
      return res.status(400).send("User with this email already exists");
    }

    let user = new User({
      name: resData.name,
      email: resData.email,
      uses: 0,
    });

    console.log(user);
    user = await user.save();
    res.send("Login verified");
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).send("Unauthorized");
  }
});

router.delete("/:id", async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
        return res.status(404).send("The user with the given ID was not found.");
    }
    res.send(user);
});

module.exports = router;
