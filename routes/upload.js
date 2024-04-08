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
    distinct_section_headings:
      "RETURN PLAIN TEXT ONLY WITH NO STYLING! Can you outline how I can improve the section headings in my resume, to  make my resume better? If my resume aligns with my goal job, in terms of  the headings used, tell me I've done a good job and that no further  improvement is needed" +
      text,
    logical_section_flow:
      "RETURN PLAIN TEXT ONLY WITH NO STYLING! Outline the section flow of my resume, focus on making sure it's logical and optimized for my goal job/industry." +
      text,
    separation_of_past_work_experience:
      "RETURN PLAIN TEXT ONLY WITH NO STYLING! Outline whether the experience section of the resume is set out  correctly, clearly outlining each role in the correct order of  importance and relevancy in relation to the goal job/industry" +
      text,
    skill_categorization:
      "RETURN PLAIN TEXT ONLY WITH NO STYLING! Outline whether the skills are grouped in a way that makes it easy  to identify areas of expertise, such as technical skills, languages, and  soft skills. Each category should be clearly labeled with a subheading." +
      text,
    clarity_in_educational_background:
      "RETURN PLAIN TEXT ONLY WITH NO STYLING! Give me an outline of whether the educational section is organized with  clear demarcations between different qualifications, including the  degree obtained if it exists the institution attended etc, and  graduation dates." +
      text,
    additional_sections:
      "RETURN PLAIN TEXT ONLY WITH NO STYLING! Please take into account the goal job/job being applied for and note any additional sections that are usually in a resume in this field that are not present in this resume and make a suggestion on which possible sections could be added or cut depending on which are needed." +
      text,
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
