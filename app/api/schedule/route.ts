import { NextResponse } from "next/server";
import pdf from "@cedrugs/pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanJsonResponse(text: string) {
  return text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

const schedulePrompt = `
You are StudyBuddy.

Your task is to extract a university student's PERSONAL WEEKLY CLASS SCHEDULE.

Return ONLY valid JSON.
Do not use markdown.
Do not invent information.

Return this exact structure:

{
  "schedule": [
    {
      "courseCode": "",
      "activityType": "",
      "day": "",
      "startTime": "",
      "endTime": "",
      "room": "",
      "section": ""
    }
  ]
}

EXTRACTION RULES:

1. courseCode
Use the actual course code shown.

Examples:
"MTH425"
"COE318"
"ELE302"
"PCS224"

Remove spaces between the letters and numbers.

For example:
"MTH 425" -> "MTH425"

2. activityType
Use one of:

"lecture"
"lab"
"tutorial"
"seminar"
"other"

Interpret words like:
Laboratory -> lab
Tutorial -> tutorial
Lecture -> lecture

3. day
Return the full weekday:

"Monday"
"Tuesday"
"Wednesday"
"Thursday"
"Friday"
"Saturday"
"Sunday"

4. startTime and endTime
Use 24-hour HH:MM format.

Examples:

8:00AM -> "08:00"
12:00PM -> "12:00"
1:00PM -> "13:00"
6:00PM -> "18:00"

5. room
Preserve the building/location shown as clearly as possible.

Examples:

"Yonge-Dundas Square 12"
"Library Building 072"
"George Vari Eng & Comp Centre 310"

Do not invent a room if none is visible.

6. section
Extract the section number/code when shown.

Examples:
"011"
"012"
"071"
"181"

If unavailable, return "".

7. Multiple meetings
If the same course meets multiple times during the week,
create a separate schedule item for EACH meeting.

8. Do not create calendar dates.
This endpoint is only extracting the recurring weekly timetable.

9. Ignore dates appearing in column headings unless they are needed
to understand which weekday the column represents.

10. Carefully distinguish between lecture, laboratory, and tutorial.

11. Check the ENTIRE timetable before responding.

12. If a cell contains both a course code and section number such as:

"MTH 425 - 012"

then:
courseCode = "MTH425"
section = "012"

Return JSON only.
`;

async function callGeminiWithText(scheduleText: string) {
  const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ];

  const delays = [500, 1500, 3000];

  let lastError: unknown = null;

  for (const modelName of models) {
    for (
      let attempt = 0;
      attempt < delays.length;
      attempt++
    ) {
      try {
        console.log(
          `Schedule text extraction: ${modelName}, attempt ${
            attempt + 1
          }`
        );

        const model = genAI.getGenerativeModel({
          model: modelName,
        });

        const result = await model.generateContent(`
${schedulePrompt}

TIMETABLE TEXT:

${scheduleText}
`);

        const responseText = cleanJsonResponse(
          result.response.text()
        );

        return JSON.parse(responseText);
      } catch (error) {
        lastError = error;

        console.error(
          `${modelName} text extraction attempt ${
            attempt + 1
          } failed:`,
          error
        );

        if (attempt < delays.length - 1) {
          await sleep(delays[attempt]);
        }
      }
    }
  }

  console.error(
    "All Gemini text schedule attempts failed:",
    lastError
  );

  return null;
}

async function callGeminiWithImage(
  buffer: Buffer,
  mimeType: string
) {
  const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ];

  const delays = [500, 1500, 3000];

  const base64Image = buffer.toString("base64");

  let lastError: unknown = null;

  for (const modelName of models) {
    for (
      let attempt = 0;
      attempt < delays.length;
      attempt++
    ) {
      try {
        console.log(
          `Schedule image extraction: ${modelName}, attempt ${
            attempt + 1
          }`
        );

        const model = genAI.getGenerativeModel({
          model: modelName,
        });

        const result = await model.generateContent([
          {
            text: schedulePrompt,
          },
          {
            inlineData: {
              data: base64Image,
              mimeType,
            },
          },
        ]);

        const responseText = cleanJsonResponse(
          result.response.text()
        );

        return JSON.parse(responseText);
      } catch (error) {
        lastError = error;

        console.error(
          `${modelName} image extraction attempt ${
            attempt + 1
          } failed:`,
          error
        );

        if (attempt < delays.length - 1) {
          await sleep(delays[attempt]);
        }
      }
    }
  }

  console.error(
    "All Gemini image schedule attempts failed:",
    lastError
  );

  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          message:
            "No schedule file received.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          message:
            "Please upload a PDF, PNG, JPG, JPEG, or WebP schedule.",
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

    let extractedSchedule = null;
    let rawText = "";

    // -------------------------
    // PDF schedule
    // -------------------------

    if (file.type === "application/pdf") {
      const result =
        await pdf(buffer);

      rawText =
        result.text || "";

      extractedSchedule =
        await callGeminiWithText(
          rawText
        );
    }

    // -------------------------
    // Image schedule
    // -------------------------

    if (
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      file.type === "image/webp"
    ) {
      extractedSchedule =
        await callGeminiWithImage(
          buffer,
          file.type
        );
    }

    if (!extractedSchedule) {
      return NextResponse.json(
        {
          message:
            "Could not extract schedule information.",
        },
        {
          status: 500,
        }
      );
    }

    const schedule =
      extractedSchedule.schedule ||
      [];

    console.log(
      "Extracted schedule:"
    );

    console.log(
      JSON.stringify(
        schedule,
        null,
        2
      )
    );

    return NextResponse.json({
      message:
        "Schedule processed successfully!",
      schedule,
      rawText,
      fileName: file.name,
    });
  } catch (error) {
    console.error(
      "Schedule upload error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to process schedule.",
      },
      {
        status: 500,
      }
    );
  }
}