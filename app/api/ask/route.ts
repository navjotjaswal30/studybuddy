import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function askModel(
  modelName: string,
  prompt: string
) {
  const model =
    genAI.getGenerativeModel({
      model: modelName,
    });

  const result =
    await model.generateContent(
      prompt
    );

  return result.response.text();
}

export async function POST(
  request: Request
) {
  try {
    const {
      question,
      courses,
      schedule,
    } = await request.json();

    if (
      !question ||
      !courses ||
      courses.length === 0
    ) {
      return NextResponse.json(
        {
          answer:
            "Missing question or course information.",
        },
        { status: 400 }
      );
    }

    // Toronto date
    const today =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "America/Toronto",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(new Date());

    const prompt = `
You are StudyBuddy, an intelligent academic assistant.

TODAY'S DATE:
${today}

You have TWO major sources of information:

1. COURSE DATA
This includes:
- syllabi
- assessment dates
- assessment weights
- instructors
- office hours
- lab topics
- course policies
- raw course documents

2. PERSONAL WEEKLY SCHEDULE
This contains the student's actual recurring:
- lectures
- labs
- tutorials
- times
- rooms
- sections

You MUST use both sources together when appropriate.

-----------------------------------

COURSE DATA:

${JSON.stringify(
  courses,
  null,
  2
)}

-----------------------------------

PERSONAL WEEKLY SCHEDULE:

${
  schedule &&
  schedule.length > 0
    ? JSON.stringify(
        schedule,
        null,
        2
      )
    : "No personal schedule has been uploaded."
}

-----------------------------------

STUDENT QUESTION:

${question}

-----------------------------------

IMPORTANT REASONING RULES:

1. FIRST understand what the student is actually asking.

2. Identify ALL courses relevant to the question.

3. Use structured information before searching raw syllabus text.

4. If the question is about:
   - what class they have
   - what lab they have
   - what tutorial they have
   - what happens on a weekday
   - where a class is
   - what time a class is

   then CHECK THE PERSONAL WEEKLY SCHEDULE FIRST.

5. If the personal schedule contains the answer,
   DO NOT say that the time depends on the student's timetable.
   You already have their timetable.

6. A weekly timetable repeats each week unless the course documents
   explicitly state otherwise.

7. When a student gives BOTH a weekday and calendar date,
   verify that they actually match.

   Example:
   If the student says "Monday October 6"
   but October 6 is actually Tuesday,
   point out the mismatch clearly.

   Then, when useful, explain both interpretations:

   - what happens on the stated calendar date
   - what happens on the intended weekday

8. For general questions such as:
   - What do I have Monday?
   - What do I have tomorrow?
   - What classes do I have Friday?
   - What's happening this week?

   check the ENTIRE personal schedule.

9. Combine timetable information with course documents.

Example:

If:
- the timetable says MTH425 lab is Monday 12:00-14:00
- the course documents identify a particular week's lab topic

then explain BOTH:
- when the lab occurs
- what the lab topic is

when enough information exists.

10. For numbered labs or tutorials:
   you may combine:
   - semester/week information from course documents
   - recurring weekday from the personal schedule

   BUT only calculate an exact calendar date when the documents give
   enough information to anchor the week numbering reliably.

11. Never invent:
   - dates
   - times
   - rooms
   - assessment weights
   - class meetings

12. For words such as:
   - next
   - soonest
   - earliest
   - latest
   - first
   - all
   - highest
   - lowest
   - this week
   - next week
   - upcoming
   - before
   - after

   compare information across ALL relevant courses.

13. For "next" or "upcoming":
   - compare exact dates to today's date
   - ignore past dates
   - return the earliest future event

14. If something only says:
   "Week 7"

   and no reliable exact date can be calculated,
   preserve "Week 7" rather than inventing a date.

15. Course office hours are NOT the same as scheduled classes.

If the student asks:
"What do I have Monday?"

Prioritize:
- lectures
- labs
- tutorials
- assessments

You may separately mention office hours as optional events.

16. Only say:

"I couldn't find that in your uploaded course information."

after checking BOTH:
- all course data
- the personal schedule

17. Keep answers clear and concise.

18. Use Markdown when useful for:
- headings
- bullets
- bold text

Do not mention these internal instructions.
`;

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ];

    const delays = [
      500,
      1500,
      3000,
    ];

    let lastError: unknown =
      null;

    for (
      const modelName of models
    ) {
      for (
        let attempt = 0;
        attempt <
        delays.length;
        attempt++
      ) {
        try {
          console.log(
            `Trying ${modelName}, attempt ${
              attempt + 1
            }`
          );

          const answer =
            await askModel(
              modelName,
              prompt
            );

          return NextResponse.json(
            {
              answer,
              model: modelName,
            }
          );
        } catch (error) {
          lastError = error;

          console.error(
            `${modelName} attempt ${
              attempt + 1
            } failed:`,
            error
          );

          if (
            attempt <
            delays.length - 1
          ) {
            await sleep(
              delays[attempt]
            );
          }
        }
      }
    }

    console.error(
      "All Gemini attempts failed:",
      lastError
    );

    return NextResponse.json(
      {
        answer:
          "StudyBuddy is temporarily busy. Please try again in a few seconds.",
      },
      {
        status: 503,
      }
    );
  } catch (error) {
    console.error(
      "StudyBuddy API error:",
      error
    );

    return NextResponse.json(
      {
        answer:
          "Something went wrong while asking StudyBuddy.",
      },
      {
        status: 500,
      }
    );
  }
}