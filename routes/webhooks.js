require("dotenv").config();
const express = require("express");
const router = express.Router();
const cors = require("cors");
const mongoose = require("mongoose");
const endpointSecret =
  // whsec_CtZQCK2VbZGB1AI0AOdVtNbp9I0nZui4

  "whsec_CLUh1pivkJQnbV8RlwR6g1S6pZoitNS8";

const { User } = require("./users");

router.use(cors());
router.use("/webhook", express.raw({ type: "application/json" }));

const stripe = require("stripe")(
  "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"
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
        const email = event.data.object.metadata.email;
        const user = await User.findOne({
          email: email,
        });
        console.log("found one with email " + event.data.object.metadata.email);

        const id = event.data.object.metadata.item;
        console.log("id is " + id);

        if (user && id === "1") {
          await User.updateOne({ email: email }, { $inc: { uses: 1 } });
        }
        if (user && id === "2") {
          await User.updateOne({ email: email }, { $inc: { uses: 1 } });
        }
        if (user && id === "3") {
          await User.updateOne({ email: email }, { $inc: { uses: 5 } });
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
