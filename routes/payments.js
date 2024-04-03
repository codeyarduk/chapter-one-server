require("dotenv").config();
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cors = require("cors");

router.use(cors());
router.use(express.json());
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const storeItems = new Map([
  [1, { priceInCents: 50000, name: "Learn React Today" }],
  [2, { priceInCents: 20000, name: "Learn CSS Today" }],
]);

router.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: req.body.items.map((item) => {
        const storeItem = storeItems.get(item.id);
        return {
          price: "price_1P1T8YBVg7XYyapkulFsFHk2",
          quantity: item.quantity,
          //   price_data: {
          //     currency: "usd",
          //     product_data: {
          //       name: storeItem.name,
          //     },
          //     unit_amount: storeItem.priceInCents,
          //   },
          //   quantity: item.quantity,
        };
      }),
      success_url: `${process.env.CLIENT_URL}/profile`,
      cancel_url: `${process.env.CLIENT_URL}/`,
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  //   res.send("hi");
});

module.exports = router;
