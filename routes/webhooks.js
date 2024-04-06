require("dotenv").config();
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cors = require("cors");
const endpointSecret =
  "whsec_99d28ef427ed443f2a1f54cd68f5e5333d780ddae51fc5c83eab568f40c8775a";

router.use(cors());
// router.use(express.json());
router.use("/webhook", express.raw({ type: "application/json" }));

const stripe = require("stripe")(
  "sk_test_51P1SybBVg7XYyapkqlY6AWWVRzwFS5HHPzsjM48WNlWG8mc8W3koeTyyeWLNPpH1V33wSq6rzt5pYhKtbjrq996Y00aUleJseT"
);

router.post("/webhook", async (req, res) => {
  // /api/payments/webhook
  console.log("Webhook called");
  const sig = req.headers["stripe-signature"];
  //   console.log(sig);
  // console.log(req.body);
  let event;

  try {
    // console.log(req.body);

    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event

    console.log(event);

  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntentSucceeded = event.data.object;
      console.log("PaymentIntent was successful!");
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  //   Return a 200 response to acknowledge receipt of the event
  res.send();
});

module.exports = router;
