import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    // Twilio sends incoming SMS data as form data
    const formData = await request.formData();

    const from =
      String(formData.get("From") || "").trim();

    const message =
      String(formData.get("Body") || "").trim();

    const twiml =
      new twilio.twiml.MessagingResponse();

    if (!from || !message) {
      twiml.message(
        "StudyBuddy couldn't read that message."
      );

      return new NextResponse(
        twiml.toString(),
        {
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    const supabase =
      createAdminClient();

    // =========================================
    // FIND USER BY PHONE NUMBER
    // =========================================

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("studybuddy_users")
      .select("*")
      .eq("phone_number", from)
      .maybeSingle();

    if (userError) {
      console.error(
        "SMS user lookup error:",
        userError
      );

      twiml.message(
        "StudyBuddy had trouble loading your profile. Try again shortly."
      );

      return new NextResponse(
        twiml.toString(),
        {
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    if (!user) {
      twiml.message(
        "This number isn't connected to StudyBuddy yet. Add your phone number on the StudyBuddy website first."
      );

      return new NextResponse(
        twiml.toString(),
        {
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    const userId = user.id;

    // =========================================
    // LOAD COURSES
    // =========================================

    const {
      data: courseRows,
      error: courseError,
    } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", userId);

    if (courseError) {
      console.error(
        "SMS course lookup error:",
        courseError
      );
    }

    const courses =
      (courseRows || [])
        .map((row) => row.structured_data)
        .filter(Boolean);

    // =========================================
    // LOAD WEEKLY SCHEDULE
    // =========================================

    const {
      data: scheduleRows,
      error: scheduleError,
    } = await supabase
      .from("schedule_items")
      .select("*")
      .eq("user_id", userId);

    if (scheduleError) {
      console.error(
        "SMS schedule lookup error:",
        scheduleError
      );
    }

    const schedule =
      (scheduleRows || []).map((row) => ({
        courseCode:
          row.course_code || "",

        activityType:
          row.activity_type || "",

        day:
          row.day || "",

        startTime:
          row.start_time || "",

        endTime:
          row.end_time || "",

        room:
          row.room || "",

        section:
          row.section || "",
      }));

    // =========================================
    // LOAD DERIVED EVENTS
    // =========================================

    const {
      data: eventRows,
      error: eventError,
    } = await supabase
      .from("derived_events")
      .select("*")
      .eq("user_id", userId);

    if (eventError) {
      console.error(
        "SMS event lookup error:",
        eventError
      );
    }

    const derivedEvents =
      (eventRows || []).map((row) => ({
        courseCode:
          row.course_code || "",

        name:
          row.name || "",

        type:
          row.type || "",

        date:
          row.event_date || "",

        startTime:
          row.start_time || "",

        endTime:
          row.end_time || "",

        room:
          row.room || "",

        topic:
          row.topic || "",

        weight:
          row.weight === null
            ? null
            : Number(row.weight),

        source:
          row.source || "",

        derived:
          row.derived ?? true,
      }));

    if (courses.length === 0) {
      twiml.message(
        "I found your StudyBuddy profile, but you don't have any courses saved yet."
      );

      return new NextResponse(
        twiml.toString(),
        {
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    // =========================================
    // ASK EXISTING STUDYBUDDY AI
    // =========================================

    const origin =
      new URL(request.url).origin;

    const askResponse =
      await fetch(
        `${origin}/api/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question: message,
            courses,
            schedule,
            derivedEvents,
          }),
        }
      );

    const askData =
      await askResponse.json();

    if (!askResponse.ok) {
      console.error(
        "StudyBuddy AI error:",
        askData
      );

      twiml.message(
        "StudyBuddy couldn't answer that right now. Try again shortly."
      );

      return new NextResponse(
        twiml.toString(),
        {
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    let answer =
      askData.answer ||
      "I couldn't find an answer.";

    // SMS should be concise.
    // Prevent extremely long AI replies.
    if (answer.length > 1400) {
      answer =
        answer.slice(0, 1390) +
        "...";
    }

    // =========================================
    // SAVE MESSAGE HISTORY
    // =========================================

    await supabase
      .from("sms_messages")
      .insert([
        {
          user_id: userId,
          direction: "inbound",
          body: message,
        },
        {
          user_id: userId,
          direction: "outbound",
          body: answer,
        },
      ]);

    // =========================================
    // REPLY TO USER
    // =========================================

    twiml.message(answer);

    return new NextResponse(
      twiml.toString(),
      {
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );
  } catch (error) {
    console.error(
      "Incoming SMS error:",
      error
    );

    const twiml =
      new twilio.twiml.MessagingResponse();

    twiml.message(
      "Something went wrong with StudyBuddy. Try again shortly."
    );

    return new NextResponse(
      twiml.toString(),
      {
        status: 200,

        headers: {
          "Content-Type": "text/xml",
        },
      }
    );
  }
}