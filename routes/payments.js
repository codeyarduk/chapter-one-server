require("dotenv").config();
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cors = require("cors");

router.use(cors());
router.use(express.json());
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    console.log('error');
    res.status(500).json({ error: error.message });
  }
  //   res.send("hi");
});

module.exports = router;
