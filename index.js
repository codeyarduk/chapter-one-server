const express = require("express");
const multer = require("multer");
const path = require("path");
const app = express();

// dotenv.config();

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
  const text = await pdf2html.text("uploads/" + req.file.filename);
  getReview(text);
  console.log(text);
  res.send("File uploaded successfully" + text);
});

async function getReview(text) {
  const chatCompletion = await openai.chat.completions
    .create({
      messages: [
        {
          role: "user",
          content:
            "Please analyse my resume and give me feedback on where i can improve it, I am applying for a corporate finance role, address me by my first name" +
            text,
        },
      ],
      model: "gpt-4-turbo-preview",
    })
    .then((data) => console.log(data.choices[0].message.content));

  console.log(chatCompletion);
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
