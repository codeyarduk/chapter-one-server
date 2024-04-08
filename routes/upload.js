const express = require("express");
const router = express.Router();
const verifyGoogleToken = require("../middleware/auth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const OpenAI = require("openai");
const pdf2html = require("pdf2html");
const { get } = require("http");

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

const upload = multer({ storage: storage });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.get("/", async (req, res) => {
  res.send("Hello Worldx");
});

router.post("/", verifyGoogleToken, upload.single("file"), async (req, res) => {
  // console.log(req.headers.authorization);

  console.log(req.file);
  const filePath = "uploads/" + req.file.filename;
  const text = await pdf2html.text("uploads/" + req.file.filename);
  //   const review = await getReview(text);
  await getReview(text, res);
  //   console.log(text);
  //   res.send(review);

  // Delete file after sending response
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
    } else {
      console.log("File deleted:", filePath);
    }
  });
});

async function getReview(text, res) {
  let queries = {
    ats_formatting: "what does this text contain:?" + text,
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

module.exports = router;
