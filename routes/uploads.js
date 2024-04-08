const express = require("express");

const multer = require("multer");
const path = require("path");
const app = express();
const cors = require("cors");
const fs = require("fs");

const mongoose = require("mongoose");

const session = require("express-session");

// "mongodb://localhost:27017/chapter-one"
const verifyGoogleToken = require("../middleware/auth");

const router = express.Router();

router.use(cors());
router.use(express.json());

const OpenAI = require("openai");
const pdf2html = require("pdf2html");
const { get } = require("http");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

router.get("/create", async (req, res) => {
  res.send("Hello World");
});

router.post(
  "/",
  verifyGoogleToken,

  // upload.single("file"),

  async (req, res) => {
    // console.log(req.headers.authorization);

    // console.log(req.file);
    // const filePath = "uploads/" + req.file.filename;
    // const text = await pdf2html.text("uploads/" + req.file.filename);

    // await getReview(text, res);

    await getReview(res);

    // Delete file after sending response

    //   fs.unlink(filePath, (err) => {
    //     if (err) {
    //       console.error("Error deleting file:", err);
    //     } else {
    //       console.log("File deleted:", filePath);
    //     }
    //   });
  }
);

async function getReview(res) {
  // const completion = await openai.chat.completions.create({
  //   messages: [{ role: "user", content: "give me a response of 3 words ONLY" }],
  //   model: "gpt-3.5-turbo",
  // });

  // console.log(completion.choices[0]);
  // res.send(completion.choices[0].message.content);

  let queries = {
    ats_formatting: "say hello",
    // text,
    query2: "say bye",
    // ...
  };

  let responses = {};

  for (let query in queries) {
    try {
      let result = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: queries[query],
          },
        ],
        model: "gpt-3.5-turbo",
      });
      // console.log(result.choices[0]?.message);
      responses[query] = result.choices[0]?.message.content || "";
    } catch (error) {
      res.send(error);
      console.error(`Error creating chat completion for ${query}:`, error);
    }
  }
  console.log(responses);
  res.send(responses);
}
const upload = multer({ storage: storage });
module.exports = router;
