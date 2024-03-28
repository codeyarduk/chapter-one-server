const express = require("express");
const multer = require("multer");
const path = require("path");
const app = express();
const cors = require("cors");
const fs = require("fs");

app.use(cors());
app.use(express.json());
const OpenAI = require("openai");
const pdf2html = require("pdf2html");
const { get } = require("http");

const openai = new OpenAI(process.env.OPENAI_API_KEY);

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

app.post("/upload", upload.single("file"), async (req, res) => {
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
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content:
          "Please analyse my resume and give me feedback on where i can improve it, I am applying for a corporate finance role, address me by my first name, and sign the email off from CodeYard" +
          text,
      },
    ],
    model: "gpt-3.5-turbo-0125",
    stream: true,
  });
  for await (const chunk of chatCompletion) {
    console.log(chunk.choices[0]?.delta?.content || "");
    res.write(chunk.choices[0]?.delta?.content || "");
  }
  res.end();
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
