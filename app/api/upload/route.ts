import { NextResponse } from "next/server";
import pdf from "@cedrugs/pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBasicCourseInfo(
  text: string,
  fileName: string
) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let courseCode = "";
  let courseTitle = "";

  // --------------------------------
  // 1. Prefer course code in filename
  // --------------------------------

  const fileMatch = fileName.match(
    /\b([A-Z]{3})\s?(\d{3})\b/i
  );

  if (fileMatch) {
    courseCode =
      `${fileMatch[1]}${fileMatch[2]}`.toUpperCase();
  }

  // --------------------------------
  // 2. Look for that same course code
  //    inside the document
  // --------------------------------

  if (courseCode) {
    const spacedCode =
      `${courseCode.slice(0, 3)}\\s*${courseCode.slice(3)}`;

    const courseLineRegex = new RegExp(
      `\\b${spacedCode}\\b\\s*(?:[-–—:]\\s*)?(.+)`,
      "i"
    );

    for (const line of lines.slice(0, 100)) {
      // Ignore obvious non-course metadata
      if (
        /office|room|phone|email|section/i.test(line)
      ) {
        continue;
      }

      const match = line.match(courseLineRegex);

      if (match) {
        const possibleTitle =
          match[1]?.trim();

        if (
          possibleTitle &&
          possibleTitle.length > 2 &&
          !/course information|course outline|fall\s*\d{4}/i.test(
            possibleTitle
          )
        ) {
          courseTitle =
            possibleTitle
              .replace(/^[-–—:]\s*/, "")
              .trim();

          break;
        }
      }
    }
  }

  // --------------------------------
  // 3. If filename had no code,
  //    search for likely course header
  // --------------------------------

  if (!courseCode) {
    for (const line of lines.slice(0, 100)) {
      if (
        /office|room|phone|email|section/i.test(line)
      ) {
        continue;
      }

      const match = line.match(
        /\b([A-Z]{3})\s?(\d{3})\b\s*(?:[-–—:]\s*)?(.+)/i
      );

      if (match) {
        const possibleTitle =
          match[3]?.trim();

        if (
          possibleTitle &&
          possibleTitle.length > 2
        ) {
          courseCode =
            `${match[1]}${match[2]}`.toUpperCase();

          courseTitle =
            possibleTitle;

          break;
        }
      }
    }
  }

  // --------------------------------
  // 4. Safe fallbacks
  // --------------------------------

  if (!courseCode) {
    courseCode = "UNKNOWN";
  }

  if (!courseTitle) {
    courseTitle = "Course";
  }

  return {
    courseCode,
    courseTitle,
  };
}

async function extractStructuredData(
  syllabusText: string,
  courseCode: string,
  courseTitle: string
) {
  const prompt = `
You are extracting structured academic information from a university course syllabus.

COURSE:
${courseCode} — ${courseTitle}

SYLLABUS:
${syllabusText}

Return ONLY valid JSON.

Do not use markdown.
Do not wrap the response in triple backticks.
Do not invent any information.

Use this exact structure:

{
  "instructors": [
    {
      "name": "",
      "email": "",
      "office": "",
      "officeHours": ""
    }
  ],
  "assessments": [
    {
      "name": "",
      "type": "",
      "date": null,
      "dateText": "",
      "weight": null,
      "coverage": ""
    }
  ],
  "policies": [
    {
      "topic": "",
      "description": ""
    }
  ],
  "importantDates": [
    {
      "name": "",
      "date": null,
      "dateText": ""
    }
  ]
}

Rules:

- "type" should use simple categories when possible:
  "midterm", "final", "quiz", "lab", "assignment",
  "project", "presentation", "activity", or "other".

- For "date":
  Use YYYY-MM-DD ONLY when the syllabus explicitly gives enough
  information to determine the exact calendar date.

- If the syllabus says something like "Week 7" but does not provide
  an exact calendar date, set:
  "date": null
  and preserve "Week 7" inside "dateText".

- NEVER calculate a calendar date from a week number.

- For weights, return numbers only.
  Example: 30% becomes 30.

- If a field is unavailable, use:
  "" for strings
  null for numbers/dates
  [] for arrays.

- Include all assessments that can reasonably be identified.

- Extract useful policies involving:
  late submissions,
  attendance,
  missed assessments,
  grading,
  labs,
  academic consideration,
  or other course-specific rules.

Return JSON only.
`;

  const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ];

  const delays = [500, 1500, 3000];

  for (const modelName of models) {
    for (
      let attempt = 0;
      attempt < delays.length;
      attempt++
    ) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
        });

        const result =
          await model.generateContent(prompt);

        let responseText =
          result.response.text().trim();

        responseText = responseText
          .replace(/^```json/i, "")
          .replace(/^```/i, "")
          .replace(/```$/i, "")
          .trim();

        return JSON.parse(responseText);
      } catch (error) {
        console.error(
          `Structured extraction failed with ${modelName}, attempt ${
            attempt + 1
          }:`,
          error
        );

        if (attempt < delays.length - 1) {
          await sleep(delays[attempt]);
        }
      }
    }
  }

  return {
    instructors: [],
    assessments: [],
    policies: [],
    importantDates: [],
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          message: "No file received.",
        },
        {
          status: 400,
        }
      );
    }

    const arrayBuffer =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    const result =
      await pdf(buffer);

    const syllabusText =
      result.text;

    const {
      courseCode,
      courseTitle,
    } = extractBasicCourseInfo(
      syllabusText,
      file.name
    );

    const structuredData =
      await extractStructuredData(
        syllabusText,
        courseCode,
        courseTitle
      );

    const courseData = {
      code: courseCode,
      title: courseTitle,
      instructors:
        structuredData.instructors || [],
      assessments:
        structuredData.assessments || [],
      policies:
        structuredData.policies || [],
      importantDates:
        structuredData.importantDates || [],
      rawText: syllabusText,
    };

    console.log(
      "Structured course data:"
    );

    console.log(
      JSON.stringify(
        courseData,
        null,
        2
      )
    );

    return NextResponse.json({
      message: `${courseCode} syllabus processed successfully!`,
      courseData,

      // Keeping these temporarily so the
      // existing frontend doesn't break.
      text: syllabusText,
      courseCode,
      courseTitle,
    });
  } catch (error) {
    console.error(
      "Upload error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to process syllabus.",
      },
      {
        status: 500,
      }
    );
  }
}