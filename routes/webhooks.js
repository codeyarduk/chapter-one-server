require("dotenv").config();
const express = require("express");
const router = express.Router();
const cors = require("cors");
const mongoose = require("mongoose");
const endpointSecret =
  "whsec_99d28ef427ed443f2a1f54cd68f5e5333d780ddae51fc5c83eab568f40c8775a";

const { User } = require("./users");

router.use(cors());
router.use("/webhook", express.raw({ type: "application/json" }));

const stripe = require("stripe")(
  "sk_test_51P1SybBVg7XYyapkqlY6AWWVRzwFS5HHPzsjM48WNlWG8mc8W3koeTyyeWLNPpH1V33wSq6rzt5pYhKtbjrq996Y00aUleJseT"
);

router.post("/webhook", async (req, res) => {
  // /api/payments/webhook
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      console.log("PaymentIntent was successful!");
      break;
    // ... handle other event types
    case "checkout.session.completed":
      console.log("User should be credited with 5 credits");
      try {
        const user = await User.findOne({
          email: event.data.object.metadata.email,
        });
        console.log("found one with email " + event.data.object.metadata.email);

        const id = event.data.object.metadata.item;
        console.log("id is " + id);

        if (user && id === "1") {
          await User.updateOne({ $inc: { uses: 1 } });
        }
        if (user && id === "2") {
          await User.updateOne({ $inc: { uses: 5 } });
        }
        if (user && id === "3") {
          await User.updateOne({ $inc: { uses: 15 } });
        }

        // Continue processing here
      } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
      }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  //   Return a 200 response to acknowledge receipt of the event
  res.send();
});

module.exports = router;
