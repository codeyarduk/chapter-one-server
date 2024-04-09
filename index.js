const express = require("express");
const multer = require("multer");
const path = require("path");
const app = express();
const cors = require("cors");
const fs = require("fs");
const { router } = require("./routes/users");
const mongoose = require("mongoose");
const payments = require("./routes/payments");
const session = require("express-session");
const webhooks = require("./routes/webhooks");
const getUploads = require("./routes/upload");
const reviews = require("./routes/reviews");

mongoose
  .connect(process.env.MONGO_CONNECTION_STRING, {})
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.log(err));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  })
);
app.use(cors());
app.use("/api/payments", webhooks);
app.use(express.json());
app.use("/api/users", router);
app.use("/api/payments", payments);
app.use("/api/upload", getUploads);
app.use("/api/reviews", reviews);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
