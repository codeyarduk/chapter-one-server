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

  const basePrompt = `RETURN PLAIN TEXT ONLY WITH NO STYLING DO NOT USE ANY MARK DOWN OF ANY KIND! Keep your answer to no more than 55 words, and dont add a title. Use simpler language. Please talk as if you are talking to the candidate with a friendly tone, but don't use their name just keep it factual. This candidate is applying for this job: ${req.body.jobTitle} use this information to help guide your feedback. DO NOT START SENTENCES LIKE "HI" or "YES" DO START WITH "YOUR" or "THIS". DO NOT END SENTENCES WITH AFFIRMATIONS DIRECTED AT THE CANDIDATE LIKE "Good luck" or "good job"`;
  const baseRatingPrompt = `I'm applying to a job as a ${req.body.jobTitle}, please rate this resume on a scale of 1 to 100 `;
  const job = req.body.jobTitle;
  console.log(req.file);
  const filePath = "uploads/" + req.file.filename;
  const text = await pdf2html.text("uploads/" + req.file.filename);
  //   const review = await getReview(text);
  await getReview(text, basePrompt, baseRatingPrompt, job, email, res);
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

async function getReview(text, basePrompt, baseRatingPrompt, job, email, res) {
  let queries = {
    // FORMATTING
    formatting_rating: `${text}  Based on the formatting and structure of this resume I want you to rate how good the formatting and structure is on a scale of 1 to 100. With 1 being very bad formatting and 100 meaning its perfect and needs no further improvements. Only output a numerical number between 1 and 100. Do's: Output a numerical number between 1 and 100, Dont's: Don't use markdown formatting, Don't output anything other than the number.`,
    distinct_section_headings: `${text} Can you outline how I can improve the section headings in my resume, to  make my resume better? If my resume aligns with my goal job, in terms of  the headings used, tell me I've done a good job and that no further  improvement is needed ${basePrompt}`,
    logical_section_flow: `${text} Outline the section flow of my resume, focus on making sure it's logical and optimized for my goal job/industry. ${basePrompt} `,
    separation_of_past_work_experience: `${text}Outline whether the experience section of the resume is set out  correctly, clearly outlining each role in the correct order of  importance and relevancy in relation to the goal job/industry ${basePrompt}  `,
    skill_categorization: `${text}Outline whether the skills are grouped in a way that makes it easy  to identify areas of expertise, such as technical skills, languages, and  soft skills. Each category should be clearly labeled with a subheading. ${basePrompt} `,
    clarity_in_educational_background: `${text} Give me an outline of whether the educational section is organized with  clear demarcations between different qualifications, including the  degree obtained if it exists the institution attended etc, and  graduation dates. ${basePrompt} `,
    additional_sections: `${text}Please take into account the goal job/job being applied for and note any additional sections that are usually in a resume in this field that are not present in this resume and make a suggestion on which possible sections could be added or cut depending on which are needed. ${basePrompt} `,
    // GOAL ALIGNMENT
    goal_alignment_rating: `${text} Based on the goals of getting a job as a ${job}  I want you to rate how much you think this resume aligns with my goal on a scale of 1 to 100. With 1 being resume content and experience has nothing to do with my goal job as a ${job} and 100 meaning my experience and education align perfectly and I don't need to make any other improvements. Only output a numerical number between 1 and 100. Do's: Output a numerical number between 1 and 100, Dont's: Don't use markdown formatting, Don't output anything other than the number.`,
    your_given_career_objective: `${text} Does this resume include a section about the career objective? The  section should be a concise statement or summary at the beginning  of  the resume that clearly articulates the candidates career goals and how  they  align with the role they are applying for. Tailor this section to  reflect  the specific job and company, indicating how the candidates  skills, experience,  and aspirations make them a perfect fit. If no  career objective section is found, please give me instructions on how to  add one ${basePrompt} `,
    relevant_work_experience: ` ${text}is there any other work experience I should have? ${basePrompt} `,
    skills_section_tailored_to_the_job: `${text}Outline whether  the resume corrrectly list skills that are most relevant to your goal  job. This could include  technical skills, software proficiencies,  languages, or soft skills  like leadership and communication. Ensure  these skills match those  listed in the job description or are known to  be valued in your target  industry. I am running other prompts for  project work and experience, keep your answer on only the skills. ${basePrompt} `,
    education_and_continuous_learning: `${text} If the goal job requires specific educational qualifications or values   continuous learning, make sure the resume education section highlights  any relevant degrees, certifications, and any ongoing or recent  professional development courses that align with the candidates career  aspirations. ${basePrompt} `,
    projects_and_portfolio: `${text} If applicable, check if the candidate should include a section about  projects and portfolio, such as if they are a freelancer etc, or if  projects are required for their job, advise the best course of action on  their specific situation. ${basePrompt} `,
    volunteer_work_and_extracurricular_activities: `check if the candidate should Include volunteer experiences, leadership  roles in clubs or  organizations. Advise them on including any that they  currently have, else congratulate them on existing ones. Focus only on  volunteer work or club roles, don't look at anything else in the resume ${basePrompt} `,
    // Keyword optimisation and ats compatibility
    key_word_rating: `${text} Based on the goals of getting a job as a ${job}  I want you to rate how good my use of keywords are and how compatible the resume is with ATS on a scale of 1 to 100. With 1 being no ATS compatibility and keywords have nothing to do with my goal job as a ${job}, with 100 meaning the resume is fully ATS compatible and the keywords align perfectly for my desired job and I don't have to make any other improvements. Only output a numerical number between 1 and 100. Do's: Output a numerical number between 1 and 100, Dont's: Don't use markdown formatting, Don't output anything other than the number.`,
    job_description_alignment: `${text}Specifically look at whether the resume is tailored to include keywords  and phrases that match the job  description. This involves a careful  selection of skills,  qualifications, and experiences that are directly  mentioned or implied  in the job listing. Use the exact language where  appropriate. Optimise these keywords for ATS systems, and then give me  your 3 best imrpovement suggestions, when taking into account the goal  job ${basePrompt} `,
    skills_section_optimization: `${text} Check for me whether the skills section of my resume is optimised for  ATS compatibility and give me tips on how to optimise it further. ${basePrompt} `,
    professional_experience_keyword_integration: `${text} Look at the experience section of the resume and check if I have used  keywords that are actionable and are ATS optimised, then give me tips on  how to improve it further or how to start if I haven't done so already ${basePrompt} `,
    education_and_certifications: `${text} Check whether I have included in my certifications, the full title as  well as any common  abbreviations, as some ATS systems may search for  either. Then give me tips to improve the ats compatability of the  certifications listed ${basePrompt} `,
    standard_formatting_for_ats: `${text} now check my whole resume for a minimal ats layout and formatting, tell  me to remove anything that I shouldn't have in it for optimal  compatibility. Don't talk about keywords, look at the resume of the  candidate that I gave you ${basePrompt} `,
    file_format_and_naming_conventions: `${text} give me some useful ats tips on file formatting and naming conventions ${basePrompt} `,
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
        model: "gpt-3.5-turbo-0125",
        // model: "gpt-4-turbo",
      });
      console.log(result.usage);
      console.log(result.choices[0]?.message.content);
      responses[query] = result.choices[0]?.message.content || "";
    } catch (error) {
      console.error(`Error creating chat completion for ${query}:`, error);
      resolved = false;
    }
  });

  Promise.all(promises)
    .then(() => {
      res.send(responses);
      let date = new Date();
      let dateString = date.toISOString().split("T")[0];
      const returnObject = {
        id: uuid.v4(),
        date: dateString,
        review: responses,
      };
      addReview(returnObject);
      // All API calls are done here
    })
    .catch((error) => {
      // Handle any error that occurred during any of the API calls
      res.send(error);
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
