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
  Please talk as if you are talking to me as the candidate. I'm giving you 6 prompts, I want you to replace the prompt under each heading with the respective output. Keep the format, use plain text. In the output, please don't include the headings, just use a line break. Do's: Keep each one of the 6 to 100 words each. Keep the total response to above 500 words, evenly split between all of the headings. Keep the line between each paragraph to a single /n Dont's:Don't respond to the prompt with language like "Yes, xyz" rather use "Your headings are good"`;

  // Defining the prompts for each specific section
  const formattingPrompts = `Distinct Section Headings:
Can you outline how I can improve the section headings in my resume, to make my resume better? If my resume aligns with my goal job, in terms of the headings used, tell me I've done a good job and that no further improvement is needed 

Logical Section Flow:
Outline the "section flow" of my resume, focus on making sure it's logical and optimized for my goal job/industry. 

Separation of Past Work Experience:
Now outline whether the experience section of the resume is set out correctly, clearly outlining each role in the correct order of importance and relevancy in relation to the goal job/industry 

Skill Categorization:
Now outline whether the skills are grouped in a way that makes it easy to identify areas of expertise, such as technical skills, languages, and soft skills. Each category should be clearly labeled with a subheading. 

Clarity in Educational Background: 
Give me an outline of whether the educational section is organized with clear demarcations between different qualifications, including the degree obtained if it exists the institution attended etc, and graduation dates. 

Additional Sections:
Please take into account the goal job/job being applied for and note any additional sections that are usually in a resume in this field that are not present in this resume and make a suggestion on which possible sections could be added or cut depending on which are needed. `;
  const goalAlignmentPrompts = `Your Given Career Objective:
Does this resume include a section about the career objective? The section should be a concise statement or summary at the beginning of the resume that clearly articulates the candidates career goals and how they align with the role they are applying for. Tailor this section to reflect the specific job and company, indicating how the candidates skills, experience, and aspirations make them a perfect fit. If no career objective section is found, please give me instructions on how to add one

Relevant Work Experience:
If the resume doesn't contain a work experience section, suggest the candidate to add one. If it is present, please compare it directly to the level, or estimated level of seniority of the job and compare the required work experience for that position, with the candidates work experience, you are allowed to suggest them doing some more work at a current tier before they would meet work requirements for that tier. 

Skills Section Tailored to the Job:
Outline whether the resume corrrectly list skills that are most relevant to your goal job. This could include technical skills, software proficiencies, languages, or soft skills like leadership and communication. Ensure these skills match those listed in the job description or are known to be valued in your target industry. I am running other prompts for project work and experience, keep your answer on only the skills.

Education and Continuous Learning:
If the goal job requires specific educational qualifications or values continuous learning, make sure the resume education section highlights any relevant degrees, certifications, and any ongoing or recent professional development courses that align with the candidates career aspirations.

Projects and Portfolio:
If applicable, check if the candidate should include a section about projects and portfolio, such as if they are a freelancer etc, or if projects are required for their job, advise the best course of action on their specific situation.

Volunteer Work and Extracurricular Activities:
check if the candidate should Include volunteer experiences, leadership roles in clubs or organizations. Advise them on including any that they currently have, else congratulate them on existing ones. Focus only on volunteer work or club roles, don't look at anything else in the resume.`;
  const keywordPrompts = `Job Description Alignment:
Specifically look at whether the resume is tailored to include keywords and phrases that match the job description. This involves a careful selection of skills, qualifications, and experiences that are directly mentioned or implied in the job listing. Use the exact language where appropriate. Optimise these keywords for ATS systems, and then give me your 3 best imrpovement suggestions, when taking into account the goal job

Skills Section Optimization:
Check for me whether the skills section of my resume is optimised for ATS compatibility and give me tips on how to optimise it further.

Professional Experience Keyword Integration:
Look at the experience section of the resume and check if I have used keywords that are actionable and are ATS optimised, then give me tips on how to improve it further or how to start if I haven't done so already

Education and Certifications:
Check whether I have included in my certifications, the full title as well as any common abbreviations, as some ATS systems may search for either. Then give me tips to improve the ats compatability of the certifications listed

Standard Formatting for ATS:
now check my whole resume for a minimal ats layout and formatting, tell me to remove anything that I shouldn't have in it for optimal compatibility. Don't talk about keywords, look at the resume of the candidate that I gave you

File Format and Naming Conventions:
give me some useful ats tips on file formatting and naming conventions.`;

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
    formatting: `${job} ${text} ${formattingPrompts} ${basePrompt}`,
    goalAlignment: `${job} ${text} ${goalAlignmentPrompts} ${basePrompt}`,
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
