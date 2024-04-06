require("dotenv").config();
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cors = require("cors");
const endpointSecret =
  "whsec_99d28ef427ed443f2a1f54cd68f5e5333d780ddae51fc5c83eab568f40c8775a";

router.use(cors());
router.use(express.json());
const stripe = require("stripe")(
  "sk_test_51P1SybBVg7XYyapkqlY6AWWVRzwFS5HHPzsjM48WNlWG8mc8W3koeTyyeWLNPpH1V33wSq6rzt5pYhKtbjrq996Y00aUleJseT"
);

const rawBodySaver = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};

const storeItems = new Map([
  [1, { price_id: "price_1P2JGvBVg7XYyapkZMw1qn0c", name: "Basic", tokens: 1 }],
  [
    2,
    { price_id: "price_1P2JFZBVg7XYyapkFALQCSNw", name: "Standard", tokens: 5 },
  ],
  [
    3,
    { price_id: "price_1P1T8YBVg7XYyapkulFsFHk2", name: "Premium", tokens: 15 },
  ],
]);

router.post("/create-checkout-session", async (req, res) => {
  console.log(req.body);
  try {
    const storeItem = storeItems.get(req.body.item.id);
    console.log(storeItem);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price: storeItem.price_id,
          quantity: req.body.item.quantity,
          //   price_data: {
          //     currency: "usd",
          //     product_data: {
          //       name: storeItem.name,
          //     },
          //     unit_amount: storeItem.priceInCents,
          //   },
          //   quantity: item.quantity,
        },
      ],

      success_url: `${process.env.CLIENT_URL}/profile`,
      cancel_url: `${process.env.CLIENT_URL}/`,
    });
    res.json({ url: session.url });
  } catch (error) {
    console.log("error");
    res.status(500).json({ error: error.message });
  }
  //   res.send("hi");
});

// router.post(
//   "/webhook",
//   express.json({ verify: rawBodySaver }),
//   async (req, res) => {
//     // /api/payments/webhook
//     console.log("Webhook called");
//     const sig = req.headers["stripe-signature"];
//     //   console.log(sig);
//     // console.log(req.body);
//     let event;

//     try {
//       console.log(req.rawBody);

//       event = await stripe.webhooks.constructEvent(
//         req.rawBody,
//         sig,
//         endpointSecret
//       );
//     } catch (err) {
//       console.log(`Webhook Error: ${err.message}`);
//       res.status(400).send(`Webhook Error: ${err.message}`);
//       return;
//     }

//     // Handle the event

//     console.log(event);

//     //   switch (event.type) {
//     //     case "payment_intent.succeeded":
//     //       const paymentIntentSucceeded = event.data.object;
//     //       console.log("PaymentIntent was successful!");
//     //       // Then define and call a function to handle the event payment_intent.succeeded
//     //       break;
//     //     // ... handle other event types
//     //     default:
//     //       console.log(`Unhandled event type ${event.type}`);
//     //   }

//     // Return a 200 response to acknowledge receipt of the event
//     res.send();
//   }
// );

module.exports = router;
