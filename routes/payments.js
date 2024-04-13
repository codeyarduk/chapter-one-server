require("dotenv").config();
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const endpointSecret = "whsec_CLUh1pivkJQnbV8RlwR6g1S6pZoitNS8";

router.use(cors());
router.use(express.json());
const stripe = require("stripe")(
  "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"
);

const storeItems = new Map([
  [1, { price_id: "price_1P4MpUBVg7XYyapkfigLDw9T", name: "Basic", tokens: 1 }],
  [
    2,
    { price_id: "price_1P4hJqBVg7XYyapko49hNtmk", name: "Standard", tokens: 1 },
  ],
  [
    3,
    { price_id: "price_1P4Mx6BVg7XYyapkJOwXXS4i", name: "Premium", tokens: 5 },
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
      success_url: `${process.env.CLIENT_URL}/profile`,
      cancel_url: `${process.env.CLIENT_URL}/`,
    });
    res.json({ url: session.url });
  } catch (error) {
    console.log("error");
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
