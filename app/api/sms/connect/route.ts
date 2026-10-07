import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (phone.trim().startsWith("+") && digits.length >= 8) {
    return `+${digits}`;
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      phoneNumber,
      courses,
      schedule,
      derivedEvents,
    } = body;

    if (typeof phoneNumber !== "string") {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const normalizedPhone =
      normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
      return NextResponse.json(
        {
          error:
            "Enter a valid phone number, including country code if outside Canada or the U.S.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("studybuddy_users")
      .upsert(
        {
          phone_number: normalizedPhone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "phone_number",
        }
      )
      .select()
      .single();

    if (userError || !user) {
      console.error("User upsert error:", userError);

      return NextResponse.json(
        {
          error:
            "Could not save your StudyBuddy profile.",
        },
        { status: 500 }
      );
    }

    const userId = user.id;

    // Save/update the user's current courses.
    if (Array.isArray(courses)) {
      for (const course of courses) {
        if (!course?.code) continue;

        const {
          error: courseError,
        } = await supabase
          .from("courses")
          .upsert(
            {
              user_id: userId,
              code: course.code,
              title: course.title ?? "",
              raw_text: course.rawText ?? "",
              structured_data: course,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "user_id,code",
            }
          );

        if (courseError) {
          console.error(
            "Course save error:",
            courseError
          );
        }
      }
    }

    // Replace the user's weekly schedule snapshot.
    const {
      error: deleteScheduleError,
    } = await supabase
      .from("schedule_items")
      .delete()
      .eq("user_id", userId);

    if (deleteScheduleError) {
      console.error(
        "Schedule delete error:",
        deleteScheduleError
      );
    }

    if (
      Array.isArray(schedule) &&
      schedule.length > 0
    ) {
      const scheduleRows = schedule.map(
        (item) => ({
          user_id: userId,
          course_code:
            item.courseCode ?? "",
          activity_type:
            item.activityType ?? "",
          day: item.day ?? "",
          start_time:
            item.startTime || null,
          end_time:
            item.endTime || null,
          room: item.room ?? "",
          section: item.section ?? "",
        })
      );

      const {
        error: scheduleError,
      } = await supabase
        .from("schedule_items")
        .insert(scheduleRows);

      if (scheduleError) {
        console.error(
          "Schedule save error:",
          scheduleError
        );
      }
    }

    // Replace the user's derived calendar snapshot.
    const {
      error: deleteEventsError,
    } = await supabase
      .from("derived_events")
      .delete()
      .eq("user_id", userId);

    if (deleteEventsError) {
      console.error(
        "Event delete error:",
        deleteEventsError
      );
    }

    if (
      Array.isArray(derivedEvents) &&
      derivedEvents.length > 0
    ) {
      const eventRows =
        derivedEvents.map((event) => ({
          user_id: userId,
          course_code:
            event.courseCode ?? "",
          name:
            event.name ??
            "Academic event",
          type: event.type ?? "",
          event_date:
            event.date || null,
          start_time:
            event.startTime || null,
          end_time:
            event.endTime || null,
          room: event.room || null,
          topic: event.topic || null,
          weight:
            typeof event.weight ===
            "number"
              ? event.weight
              : null,
          source:
            event.source || null,
          derived:
            event.derived ?? true,
        }));

      const {
        error: eventsError,
      } = await supabase
        .from("derived_events")
        .insert(eventRows);

      if (eventsError) {
        console.error(
          "Event save error:",
          eventsError
        );
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      phoneNumber: normalizedPhone,
    });
  } catch (error) {
    console.error(
      "SMS connect route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while saving your SMS profile.",
      },
      { status: 500 }
    );
  }
}
