import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const { courses, schedule } = await request.json();

    if (!courses || courses.length === 0) {
      return NextResponse.json({
        events: [],
      });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const prompt = `
You are StudyBuddy's academic calendar engine.

TODAY:
${today}

Your job is to combine COURSE DOCUMENTS with the student's PERSONAL
WEEKLY TIMETABLE and produce concrete academic events.

COURSES:

${JSON.stringify(courses, null, 2)}

PERSONAL WEEKLY TIMETABLE:

${JSON.stringify(schedule || [], null, 2)}

Return ONLY valid JSON using this exact structure:

{
  "events": [
    {
      "courseCode": "",
      "name": "",
      "type": "",
      "date": "",
      "startTime": "",
      "endTime": "",
      "room": "",
      "topic": "",
      "weight": null,
      "source": "",
      "derived": true
    }
  ]
}

IMPORTANT RULES:

1. Use information from BOTH course documents and the personal timetable.

2. Convert recurring course events into exact dates ONLY when enough
information exists to do so reliably.

Example:

Course document:
"Labs start in the second week of classes, week of September 14."

Lab document:
"Lab 1 – Separable DEs"
"Lab 2 – Exact DEs"
"Lab 3 – 1st order DEs: all types"

Personal timetable:
"MTH425 lab — Monday 12:00-14:00"

Then it is valid to derive:

Lab 1 -> Monday September 14
Lab 2 -> Monday September 21
Lab 3 -> Monday September 28

because the start week and recurring weekday are known.

3. Do NOT invent dates when there is no reliable anchor.

4. If reading week, holidays, cancellations, or another course document
explicitly interrupt the sequence, account for them.

5. Course timetable meetings alone should NOT all become dashboard events.
Create events when they correspond to something useful such as:
- numbered labs
- quizzes
- tests
- midterms
- assignments
- projects
- presentations
- tutorials with specified topics
- other specifically identified academic events

6. Exact assessments already carrying an explicit date may also be returned.

7. type should preferably be:
"lab"
"quiz"
"midterm"
"final"
"assignment"
"project"
"presentation"
"tutorial"
"other"

8. date MUST use YYYY-MM-DD.

9. Times MUST use HH:MM 24-hour format.

10. Use the student's own timetable time and room where applicable.

11. Do not confuse office hours with class meetings.

12. Avoid duplicate events.

13. "source" should briefly explain the basis, for example:
"Lab topics document + personal timetable"

14. derived should be true when the exact date was calculated by combining
multiple pieces of information.

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

          const result = await model.generateContent(prompt);

          const text = cleanJson(
            result.response.text()
          );

          const parsed = JSON.parse(text);

          return NextResponse.json({
            events: parsed.events || [],
          });
        } catch (error) {
          console.error(
            `${modelName} calendar attempt ${
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

    return NextResponse.json(
      {
        events: [],
        message:
          "Could not build academic calendar.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error(
      "Calendar generation error:",
      error
    );

    return NextResponse.json(
      {
        events: [],
      },
      { status: 500 }
    );
  }
}