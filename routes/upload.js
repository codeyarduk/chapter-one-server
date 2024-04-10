const express = require("express");
const router = express.Router();
const verifyGoogleToken = require("../middleware/auth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const jwtDecode = require("jwt-decode");
const uuid = require("uuid");

const OpenAI = require("openai");
const pdf2html = require("pdf2html");
const { get } = require("http");
const { User } = require("./users");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage: storage });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.get("/", async (req, res) => {
  res.send("Hello Worldx");
});

router.post("/", verifyGoogleToken, upload.single("file"), async (req, res) => {
  console.log(req.headers.authorization);

  const resData = jwtDecode.jwtDecode(req.headers.authorization);
  const email = resData.email;

  try {
    const user = await User.findOne({
      email: email,
    });
    if (user.uses === 0) {
      res.status(400).send("No uses left");
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }

  // Defining the base prompt
  const basePrompt = `This is the structure prompt to use for each heading:
  Output exactly 55 words for each heading prompt, and don’t add a title. Use simpler language.
  Please talk as if you are talking to me as the candidate. I'm giving you 6 prompts, I want you to replace the prompt under each heading with the respective output. Keep the format, use plain text. In the output, please don't include the headings, just use a line break. Do's: Keep each one of the 6 to 100 words each. Keep the total response to above 500 words, evenly split between all of the headings. Dont's:Don't respond to the prompt with language like "Yes, xyz" rather use "Your headings are good"`;

  // Defining the prompts for each specific section
  const formattingPrompts = `test`;
  const goalAlignmentPrompts = ``;
  const keywordPrompts = ``;

  const baseRatingPrompt = `I'm applying to a job as a ${req.body.jobTitle}, please rate this resume on a scale of 1 to 100 `;
  const job = req.body.jobTitle;
  console.log(req.file);
  const filePath = "uploads/" + req.file.filename;
  const text = await pdf2html.text("uploads/" + req.file.filename);
  //   const review = await getReview(text);
  await getReview(
    text,
    basePrompt,
    baseRatingPrompt,
    formattingPrompts,
    goalAlignmentPrompts,
    keywordPrompts,
    job,
    email,
    res,
  );
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

async function getReview(
  text,
  basePrompt,
  baseRatingPrompt,
  formattingPrompts,
  goalAlignmentPrompts,
  keywordPrompts,
  job,
  email,
  res,
) {
  let queries = {
    formatting: `${text} ${formattingPrompts} ${basePrompt}`,
    goalAlignment: `${text} ${goalAlignmentPrompts} ${basePrompt}`,
    keywords: `${text} ${keywordPrompts} ${basePrompt}`,
    formatting_rating: `${text} Based on the formatting and structure of this resume I want you to rate how good the formatting and structure is on a scale of 1 to 100. With 1 being very bad formatting and 100 meaning its perfect and needs no further improvements. Only output a numerical number between 1 and 100. Do's: Output a numerical number between 1 and 100, Dont's: Don't use markdown formatting, Don't output anything other than the number.`,
    goal_alignment_rating: `${text} Based on the goals of getting a job as a ${job} I want you to rate how much you think this resume aligns with my goal on a scale of 1 to 100. With 1 being resume content and experience has nothing to do with my goal job as a ${job} and 100 meaning my experience and education align perfectly and I don't need to make any other improvements. Only output a numerical number between 1 and 100. Do's: Output a numerical number between 1 and 100, Dont's: Don't use markdown formatting, Don't output anything other than the number.`,
    key_word_rating: `${text} Based on the goals of getting a job as a ${job} I want you to rate how good my use of keywords are and how compatible the resume is with ATS on a scale of 1 to 100. With 1 being no ATS compatibility and keywords have nothing to do with my goal job as a ${job}, with 100 meaning the resume is fully ATS compatible and the keywords align perfectly for my desired job and I don't have to make any other improvements. Only output a numerical number between 1 and 100. Do's: Output a numerical number between 1 and 100, Dont's: Don't use markdown formatting, Don't output anything other than the number.`,
  };

  let output = {
    // FORMATTING
    formatting_rating: 0,
    distinct_section_headings: 0,
    logical_section_flow: 0,
    separation_of_past_work_experience: 0,
    skill_categorization: 0,
    clarity_in_educational_background: 0,
    additional_sections: 0,
    // GOAL ALIGNMENT
    goal_alignment_rating: 0,
    your_given_career_objective: 0,
    relevant_work_experience: 0,
    skills_section_tailored_to_the_job: 0,
    education_and_continuous_learning: 0,
    projects_and_portfolio: 0,
    volunteer_work_and_extracurricular_activities: 0,
    // KEYWORD OPTIMIZATION AND ATS COMPATIBILITY
    key_word_rating: 0,
    job_description_alignment: 0,
    skills_section_optimization: 0,
    professional_experience_keyword_integration: 0,
    education_and_certifications: 0,
    standard_formatting_for_ats: 0,
    file_format_and_naming_conventions: 0,
  };

  let responses = {};
  let resolved = true;

  let promises = Object.keys(queries).map(async (query) => {
    try {
      let result = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: queries[query],
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.1,
      });

      let responseText = result.choices[0]?.message.content || "";
      responses[query] = responseText;

      // Split the response by new lines and filter out any empty lines
      let paragraphs = responseText
        .split("\n")
        .filter((paragraph) => paragraph.trim() !== "");

      // For rating queries, simply assign the value
      if (query.includes("_rating")) {
        output[query] = parseFloat(paragraphs[0]) || 0;
      } else {
        // For other queries, map each paragraph to the corresponding property in the output object
        paragraphs.forEach((paragraph, index) => {
          let propertyKey = Object.keys(output).find(
            (key, idx) => key.startsWith(query) && idx === index,
          );
          if (propertyKey) {
            output[propertyKey] = paragraph;
          }
        });
      }
    } catch (error) {
      console.error(`Error creating chat completion for ${query}:`, error);
      resolved = false;
    }
  });

  Promise.all(promises)
    .then(() => {
      res.send(output); // Send the formatted output instead of the raw responses
      let date = new Date();
      let dateString = date.toISOString().split("T")[0];
      const returnObject = {
        id: uuid.v4(),
        date: dateString,
        review: output, // Use the formatted output for the review
      };
      addReview(returnObject);
    })
    .catch((error) => {
      console.error("Error in Promise.all: ", error);
      res.status(500).send("An error occurred processing your review.");
    });

  const addReview = async (returnObject) => {
    try {
      await User.updateOne(
        { email: email },
        { $push: { reviews: returnObject } },
      );
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  };

  if (resolved) {
    try {
      await User.updateOne({ email: email }, { $inc: { uses: -1 } });
      await User.updateOne({ email: email }, { $inc: { used: +1 } });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  }

  //   for (let query in queries) {
  //     try {
  //       let result = await openai.chat.completions.create({
  //         messages: [
  //           {
  //             role: "user",
  //             content: queries[query],
  //           },
  //         ],
  //         model: "gpt-3.5-turbo",
  //       });
  //       // console.log(result.choices[0]?.message);
  //       responses[query] = result.choices[0]?.message.content || "";
  //     } catch (error) {
  //       res.send(error);
  //       console.error(`Error creating chat completion for ${query}:`, error);
  //     }
  //   }
  //   console.log(responses);
  //   res.send(responses);
}

module.exports = router;
