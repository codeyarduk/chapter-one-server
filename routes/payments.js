require("dotenv").config();
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const endpointSecret =
  "whsec_99d28ef427ed443f2a1f54cd68f5e5333d780ddae51fc5c83eab568f40c8775a";

router.use(cors());
router.use(express.json());
const stripe = require("stripe")(
  "sk_test_51P1SybBVg7XYyapkqlY6AWWVRzwFS5HHPzsjM48WNlWG8mc8W3koeTyyeWLNPpH1V33wSq6rzt5pYhKtbjrq996Y00aUleJseT"
);

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
  const user = JSON.parse(req.body.token);
  const email = user.email;
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
        },
      ],
      metadata: {
        email: email,
        item: req.body.item.id,
      },
      success_url: "chapteroneai.com/profile",
      cancel_url: "chapteroneai.com/",
    });
    res.json({ url: session.url });
  } catch (error) {
    console.log("error");
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
