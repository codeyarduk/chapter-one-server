const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
const jwtDecode = require("jwt-decode");
const session = require("express-session");

const userSchema = new mongoose.Schema(
  {
    name: String,
    lastName: String,
    email: String,
    uses: Number,
    used: Number,
    reviews: Array,
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

router.get("/", async (req, res) => {
  const users = await User.find();
  console.log(users);
  res.send(users);
});

router.post("/register", async (req, res) => {
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
      console.log(existingUser);
      console.log("User with this email already exists");
      return res.send({
        name: existingUser.name,
        lastName: existingUser.lastName,
        email: existingUser.email,
        uses: existingUser.uses,
        used: existingUser.used,
      });
      // return res.status(400).send("User with this email already exists");
    }
    let user = new User({
      name: resData.given_name,
      lastName: resData.family_name,
      email: resData.email,
      uses: 0,
      used: 0,
      reviews: [],
    });
    user = await user.save();
    const newExistingUser = await User.findOne({ email: resData.email });
    res.send({
      name: newExistingUser.name,
      lastName: newExistingUser.lastName,
      email: newExistingUser.email,
      uses: newExistingUser.uses,
      used: newExistingUser.used,
      reviews: newExistingUser.reviews,
    });
    // res.send("Login verified");
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).send("Unauthorized");
  }
});

router.post("/login", async (req, res) => {
  const token = req.body.user;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience:
        "886756526696-8pc6lu70409d3uu0jvfkojk02kjoak7t.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const userid = payload["sub"];
    // If request specified a G Suite domain:
    // const domain = payload['hd'];

    console.log(payload);

    const existingUser = await User.findOne({ email: payload.email });
    if (!existingUser) {
      let user = new User({
        name: payload.given_name,
        lastName: payload.family_name,
        email: payload.email,
        uses: 0,
        used: 0,
      });
      user = await user.save();

      let newExistingUser = await User.findOne({ email: payload.email });
      return res.send({
        name: newExistingUser.name,
        lastName: newExistingUser.lastName,
        email: newExistingUser.email,
        uses: newExistingUser.uses,
        used: newExistingUser.used,
      });
      // console.log("User with this email does not exist");
      // return res.status(400).send("User with this email does not exist");
    }
    res.send({
      name: existingUser.name,
      lastName: existingUser.lastName,
      email: existingUser.email,
      uses: existingUser.uses,
      used: existingUser.used,
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).send("Unauthorized");
  }
});

router.post("/uses/:email", async (req, res) => {
  const token = req.body.user;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience:
        "886756526696-8pc6lu70409d3uu0jvfkojk02kjoak7t.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const existingUser = await User.findOne({ email: payload.email });

    if (payload.email !== req.params.email) {
      return res.status(401).send("Unauthorized");
    }
    // console.log(payload);

    if (!existingUser) {
      console.log("User with this email does not exist");
      res.status(400).send("User with this email does not exist");
    } else {
      // console.log(existingUser);
      res.send({
        name: existingUser.name,
        lastName: existingUser.lastName,
        email: existingUser.email,
        uses: existingUser.uses,
        used: existingUser.used,
      });
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).send("Unauthorized");
  }

  //   try {
  //     const user = await User.findOne({ email: req.params.email });
  //     if (!user) {
  //       return res
  //         .status(404)
  //         .send("The user with the given email was not found.");
  //     }
  //     res.send({
  //       uses: user.uses,
  //     });
  //   } catch (err) {
  //     console.error(err);
  //     res.status(500).send("Server Error");
  //   }
});

router.delete("/:id", async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).send("The user with the given ID was not found.");
  }
  res.send(user);
});

module.exports = {
  User: mongoose.model("User", userSchema),
  router: router,
};
