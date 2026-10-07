"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

type Instructor = {
  name: string;
  email: string;
  office: string;
  officeHours: string;
};

type Assessment = {
  name: string;
  type: string;
  date: string | null;
  dateText: string;
  weight: number | null;
  coverage: string;
};

type Policy = {
  topic: string;
  description: string;
};

type ImportantDate = {
  name: string;
  date: string | null;
  dateText: string;
};

type Course = {
  code: string;
  title: string;
  instructors: Instructor[];
  assessments: Assessment[];
  policies: Policy[];
  importantDates: ImportantDate[];
  rawText: string;
};

type ScheduleItem = {
  courseCode: string;
  activityType: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  section: string;
};

type DerivedEvent = {
  courseCode: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  topic: string;
  weight: number | null;
  source: string;
  derived: boolean;
};

type DashboardItem = {
  name: string;
  type: string;
  date: string | null;
  dateText: string;
  weight: number | null;
  coverage: string;
  courseCode: string;
  courseTitle: string;
  startTime: string;
  endTime: string;
  room: string;
  topic: string;
  derived: boolean;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [scheduleFile, setScheduleFile] =
    useState<File | null>(null);

  const [schedule, setSchedule] =
    useState<ScheduleItem[]>([]);

  const [scheduleMessage, setScheduleMessage] =
    useState("");

  const [derivedEvents, setDerivedEvents] =
    useState<DerivedEvent[]>([]);

  const [calendarBuilding, setCalendarBuilding] =
    useState(false);

  // =====================================================
  // LOAD SAVED DATA
  // =====================================================

  useEffect(() => {
    const savedCourses =
      localStorage.getItem("studybuddy-courses");

    if (savedCourses) {
      try {
        setCourses(JSON.parse(savedCourses));
      } catch (error) {
        console.error(
          "Could not load saved courses:",
          error
        );
      }
    }

    const savedSchedule =
      localStorage.getItem("studybuddy-schedule");

    if (savedSchedule) {
      try {
        setSchedule(JSON.parse(savedSchedule));
      } catch (error) {
        console.error(
          "Could not load saved schedule:",
          error
        );
      }
    }

    const savedDerivedEvents =
      localStorage.getItem(
        "studybuddy-derived-events"
      );

    if (savedDerivedEvents) {
      try {
        setDerivedEvents(
          JSON.parse(savedDerivedEvents)
        );
      } catch (error) {
        console.error(
          "Could not load derived events:",
          error
        );
      }
    }

    setCoursesLoaded(true);
  }, []);

  // =====================================================
  // SAVE COURSES
  // =====================================================

  useEffect(() => {
    if (!coursesLoaded) return;

    localStorage.setItem(
      "studybuddy-courses",
      JSON.stringify(courses)
    );
  }, [courses, coursesLoaded]);

  // =====================================================
  // SAVE SCHEDULE
  // =====================================================

  useEffect(() => {
    if (!coursesLoaded) return;

    localStorage.setItem(
      "studybuddy-schedule",
      JSON.stringify(schedule)
    );
  }, [schedule, coursesLoaded]);

  // =====================================================
  // SAVE DERIVED EVENTS
  // =====================================================

  useEffect(() => {
    if (!coursesLoaded) return;

    localStorage.setItem(
      "studybuddy-derived-events",
      JSON.stringify(derivedEvents)
    );
  }, [derivedEvents, coursesLoaded]);

  // =====================================================
  // DATE HELPERS
  // =====================================================

  function getTorontoDate() {
    const parts =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());

    const year = parts.find(
      (part) => part.type === "year"
    )?.value;

    const month = parts.find(
      (part) => part.type === "month"
    )?.value;

    const day = parts.find(
      (part) => part.type === "day"
    )?.value;

    return `${year}-${month}-${day}`;
  }

  const [todayString, setTodayString] = useState("");

useEffect(() => {
  setTodayString(getTorontoDate());
}, []);

const torontoToday = todayString
  ? new Date(`${todayString}T00:00:00`)
  : null;

  function formatDate(date: string | null) {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
    }).format(
      new Date(`${date}T00:00:00`)
    );
  }

  function formatMonth(date: string | null) {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
    }).format(
      new Date(`${date}T00:00:00`)
    );
  }

  function getDayNumber(date: string | null) {
    if (!date) return "";

    return new Date(
      `${date}T00:00:00`
    ).getDate();
  }

function daysUntil(date: string | null) {
  if (!date) return 999;

  const targetDate = new Date(
    `${date}T00:00:00`
  );

  return Math.ceil(
    (targetDate.getTime() -
      torontoToday.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

  function formatTime(time: string) {
    if (!time) return "";

    const [hoursString, minutes] =
      time.split(":");

    const hours =
      Number(hoursString);

    const period =
      hours >= 12 ? "PM" : "AM";

    const displayHour =
      hours % 12 || 12;

    return `${displayHour}:${minutes} ${period}`;
  }

  // =====================================================
  // DASHBOARD DATA
  // =====================================================

  const courseAssessments: DashboardItem[] =
    courses.flatMap((course) =>
      course.assessments.map(
        (assessment) => ({
          name: assessment.name,
          type: assessment.type,
          date: assessment.date,
          dateText:
            assessment.dateText || "",
          weight: assessment.weight,
          coverage:
            assessment.coverage || "",
          courseCode: course.code,
          courseTitle: course.title,
          startTime: "",
          endTime: "",
          room: "",
          topic:
            assessment.coverage || "",
          derived: false,
        })
      )
    );

  const resolvedEvents: DashboardItem[] =
    derivedEvents.map((event) => ({
      name: event.name,
      type: event.type,
      date: event.date,
      dateText: "",
      weight: event.weight,
      coverage: event.topic || "",
      courseCode: event.courseCode,
      courseTitle: "",
      startTime:
        event.startTime || "",
      endTime:
        event.endTime || "",
      room: event.room || "",
      topic: event.topic || "",
      derived: event.derived,
    }));

  const allAcademicItems = [
    ...courseAssessments,
    ...resolvedEvents,
  ];

  const deduplicatedItems =
    allAcademicItems.filter(
      (item, index, array) =>
        index ===
        array.findIndex((other) => {
          const sameCourse =
            other.courseCode ===
            item.courseCode;

          const sameDate =
            other.date === item.date;

          const sameType =
            other.type.toLowerCase() ===
            item.type.toLowerCase();

          const normalizedName =
            item.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");

          const normalizedOtherName =
            other.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");

          const similarName =
            normalizedName ===
              normalizedOtherName ||
            normalizedName.includes(
              normalizedOtherName
            ) ||
            normalizedOtherName.includes(
              normalizedName
            );

          return (
            sameCourse &&
            sameDate &&
            sameType &&
            similarName
          );
        })
    );

const futureItems =
  deduplicatedItems
    .filter((item) => {
      if (!item.date || !torontoToday) {
        return false;
      }

      const itemDate = new Date(
        `${item.date}T00:00:00`
      );

      return itemDate >= torontoToday;
    })

  const deadlineTypes = [
    "assignment",
    "lab",
    "quiz",
    "project",
    "presentation",
    "activity",
    "tutorial",
  ];

  const upcomingDeadlines =
    futureItems.filter((item) =>
      deadlineTypes.includes(
        item.type.toLowerCase()
      )
    );

  const nextDeadline =
    upcomingDeadlines[0];

  const upcomingExams =
    futureItems.filter((item) =>
      ["midterm", "final", "test"].includes(
        item.type.toLowerCase()
      )
    );

  const nextExam =
    upcomingExams[0];

  const endOfWeek = torontoToday
  ? new Date(torontoToday)
  : null;

if (endOfWeek) {
  const currentDay =
    endOfWeek.getDay();

  const daysUntilSunday =
    currentDay === 0
      ? 0
      : 7 - currentDay;

  endOfWeek.setDate(
    endOfWeek.getDate() +
      daysUntilSunday
  );
}

const dueThisWeek =
  upcomingDeadlines.filter((item) => {
    if (
      !item.date ||
      !torontoToday ||
      !endOfWeek
    ) {
      return false;
    }

    const itemDate = new Date(
      `${item.date}T00:00:00`
    );

    return (
      itemDate >= torontoToday &&
      itemDate <= endOfWeek
    );
  });

  const upcomingItems =
    futureItems.slice(0, 5);

  // =====================================================
  // STUDY FOCUS
  // =====================================================

  const rankedStudyItems =
    futureItems
      .filter((item) => {
        const type =
          item.type.toLowerCase();

        return [
          "midterm",
          "final",
          "test",
          "quiz",
          "assignment",
          "project",
          "lab",
          "presentation",
        ].includes(type);
      })
      .map((item) => {
        const daysAway =
          daysUntil(item.date);

        let score = Math.max(
          0,
          30 - daysAway
        );

        if (
          item.weight !== null
        ) {
          score += item.weight;
        }

        switch (
          item.type.toLowerCase()
        ) {
          case "final":
            score += 30;
            break;

          case "midterm":
          case "test":
            score += 25;
            break;

          case "quiz":
            score += 15;
            break;

          case "project":
            score += 15;
            break;

          case "assignment":
            score += 10;
            break;

          case "lab":
            score += 8;
            break;

          default:
            score += 5;
        }

        return {
          ...item,
          score,
          daysAway,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score
      );

  const studyFocusItems =
    rankedStudyItems.slice(0, 2);

  // =====================================================
  // REBUILD ACADEMIC CALENDAR
  // =====================================================

  async function rebuildAcademicCalendar(
    currentCourses: Course[],
    currentSchedule: ScheduleItem[]
  ) {
    if (
      currentCourses.length === 0 ||
      currentSchedule.length === 0
    ) {
      return;
    }

    setCalendarBuilding(true);

    try {
      const response =
        await fetch(
          "/api/calendar",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              courses:
                currentCourses,
              schedule:
                currentSchedule,
            }),
          }
        );

      const data =
        await response.json();

      if (response.ok) {
        setDerivedEvents(
          data.events || []
        );
      } else {
        console.error(
          "Calendar rebuild failed:",
          data
        );
      }
    } catch (error) {
      console.error(
        "Could not rebuild academic calendar:",
        error
      );
    } finally {
      setCalendarBuilding(false);
    }
  }

  // =====================================================
  // COURSE FILE SELECTION
  // =====================================================

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles =
      Array.from(
        event.target.files || []
      );

    setFiles(selectedFiles);
    setMessage("");
  }

  // =====================================================
  // UPLOAD COURSE DOCUMENTS
  // =====================================================

  async function handleUpload() {
    if (files.length === 0) {
      setMessage(
        "Please choose at least one PDF first."
      );

      return;
    }

    setMessage(
      `Processing ${files.length} course document(s)...`
    );

    let successCount = 0;

    let updatedCourseList = [
      ...courses,
    ];

    for (
      const file of files
    ) {
      try {
        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        const response =
          await fetch(
            "/api/upload",
            {
              method: "POST",
              body: formData,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          console.error(
            `Failed to upload ${file.name}`
          );

          continue;
        }

        const newCourse: Course =
          {
            code:
              data.courseData.code,

            title:
              data.courseData.title,

            instructors:
              data.courseData
                .instructors || [],

            assessments:
              data.courseData
                .assessments || [],

            policies:
              data.courseData
                .policies || [],

            importantDates:
              data.courseData
                .importantDates || [],

            rawText:
              data.courseData
                .rawText || "",
          };

        const existingCourseIndex =
          updatedCourseList.findIndex(
            (course) =>
              course.code ===
              newCourse.code
          );

        if (
          existingCourseIndex !==
          -1
        ) {
          const existingCourse =
            updatedCourseList[
              existingCourseIndex
            ];

          const mergedCourse: Course =
            {
              ...existingCourse,

              title:
                existingCourse.title !==
                "Course"
                  ? existingCourse.title
                  : newCourse.title,

              instructors: [
                ...existingCourse.instructors,
                ...newCourse.instructors,
              ],

              assessments: [
                ...existingCourse.assessments,
                ...newCourse.assessments,
              ],

              policies: [
                ...existingCourse.policies,
                ...newCourse.policies,
              ],

              importantDates: [
                ...existingCourse.importantDates,
                ...newCourse.importantDates,
              ],

              rawText:
                existingCourse.rawText +
                `

-----------------------------
ADDITIONAL COURSE DOCUMENT
-----------------------------

` +
                newCourse.rawText,
            };

          updatedCourseList[
            existingCourseIndex
          ] = mergedCourse;
        } else {
          updatedCourseList.push(
            newCourse
          );
        }

        successCount++;
      } catch (error) {
        console.error(
          `Error processing ${file.name}:`,
          error
        );
      }
    }

    setCourses(
      updatedCourseList
    );

    setMessage(
      `${successCount} of ${files.length} file(s) processed successfully.`
    );

    setFiles([]);

    if (
      updatedCourseList.length >
        0 &&
      schedule.length > 0
    ) {
      await rebuildAcademicCalendar(
        updatedCourseList,
        schedule
      );
    }
  }

  // =====================================================
  // SCHEDULE FILE SELECTION
  // =====================================================

  function handleScheduleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      setScheduleFile(
        selectedFile
      );

      setScheduleMessage("");
    }
  }

  // =====================================================
  // UPLOAD SCHEDULE
  // =====================================================

  async function handleScheduleUpload() {
    if (!scheduleFile) {
      setScheduleMessage(
        "Please choose a schedule first."
      );

      return;
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      scheduleFile
    );

    setScheduleMessage(
      "Reading your schedule..."
    );

    try {
      const response =
        await fetch(
          "/api/schedule",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setScheduleMessage(
          data.message ||
            "Failed to process schedule."
        );

        return;
      }

      const newSchedule =
        data.schedule || [];

      setSchedule(
        newSchedule
      );

      setScheduleMessage(
        `${newSchedule.length} weekly class ${
          newSchedule.length === 1
            ? "meeting"
            : "meetings"
        } found. Schedule connected!`
      );

      setScheduleFile(null);

      if (
        courses.length > 0 &&
        newSchedule.length > 0
      ) {
        await rebuildAcademicCalendar(
          courses,
          newSchedule
        );
      }
    } catch (error) {
      console.error(error);

      setScheduleMessage(
        "Something went wrong while processing your schedule."
      );
    }
  }

  // =====================================================
  // ASK STUDYBUDDY
  // =====================================================

  async function handleQuestion() {
    if (
      courses.length === 0
    ) {
      setAnswer(
        "Upload at least one course document before asking a question."
      );

      return;
    }

    if (!question.trim()) {
      setAnswer(
        "Ask me a question first."
      );

      return;
    }

    setAnswer(
      "Thinking..."
    );

    try {
      const response =
        await fetch(
          "/api/ask",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              question,
              courses,
              schedule,
              derivedEvents,
            }),
          }
        );

      const data =
        await response.json();

      setAnswer(
        data.answer
      );
    } catch (error) {
      console.error(error);

      setAnswer(
        "Something went wrong while asking StudyBuddy."
      );
    }
  }

  // =====================================================
  // REMOVE COURSE
  // =====================================================

  async function removeCourse(
    indexToRemove: number
  ) {
    const newCourses =
      courses.filter(
        (_, courseIndex) =>
          courseIndex !==
          indexToRemove
      );

    setCourses(newCourses);

    if (
      newCourses.length > 0 &&
      schedule.length > 0
    ) {
      await rebuildAcademicCalendar(
        newCourses,
        schedule
      );
    } else {
      setDerivedEvents([]);
    }
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#111827]">

      {/* NAVBAR */}

      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          <span className="text-2xl font-bold tracking-tight">
            StudyBuddy
          </span>

          <div className="text-sm text-gray-500">
            Your semester,
            simplified.
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* HERO */}

        <section className="max-w-3xl mx-auto text-center mb-14">

          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 mb-6">
            Your AI academic
            assistant
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Your entire semester,

            <span className="block text-indigo-600">
              one question away.
            </span>
          </h1>

          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload your course
            documents and schedule
            once. StudyBuddy connects
            the dots between your
            courses, assessments,
            labs, and timetable.
          </p>
        </section>

        {/* ================================================= */}
        {/* HOW IT WORKS */}
        {/* ================================================= */}

        <section className="max-w-5xl mx-auto mb-14">

          <div className="border-y border-gray-200 py-8">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              <div className="flex gap-4">

                <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                  1
                </div>

                <div>
                  <h3 className="font-semibold text-base">
                    Add your courses
                  </h3>

                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Upload syllabi,
                    lab schedules,
                    and other course
                    documents.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">

                <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                  2
                </div>

                <div>
                  <h3 className="font-semibold text-base">
                    Connect your timetable
                  </h3>

                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    StudyBuddy maps
                    weekly course
                    information onto
                    your real class
                    schedule.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">

                <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                  3
                </div>

                <div>
                  <h3 className="font-semibold text-base">
                    Get a smarter semester
                  </h3>

                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    See deadlines,
                    labs, exams, and
                    study priorities
                    automatically.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* DASHBOARD */}
        {/* ================================================= */}

        <section className="max-w-5xl mx-auto mb-10">

          <div className="flex items-end justify-between mb-5">

            <div>
              <h2 className="text-2xl font-semibold">
                Your semester
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                A quick look at what
                needs your attention.
              </p>
            </div>

            {calendarBuilding && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-full">
                Updating calendar...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* NEXT DEADLINE */}

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

              <div className="text-sm text-gray-500 mb-3">
                Next deadline
              </div>

              {nextDeadline ? (
                <>
                  <div className="text-2xl font-semibold">
                    {formatDate(
                      nextDeadline.date
                    )}
                  </div>

                  <div className="text-sm font-medium mt-2">
                    {
                      nextDeadline.courseCode
                    }
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    {
                      nextDeadline.name
                    }
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-semibold">
                    —
                  </div>

                  <div className="text-sm text-gray-500 mt-2">
                    No dated deadline
                    found
                  </div>
                </>
              )}
            </div>

            {/* DUE THIS WEEK */}

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

              <div className="text-sm text-gray-500 mb-3">
                Due this week
              </div>

              <div className="text-3xl font-semibold">
                {
                  dueThisWeek.length
                }
              </div>

              <div className="text-sm text-gray-500 mt-2">
                {dueThisWeek.length ===
                1
                  ? "item remaining"
                  : "items remaining"}
              </div>
            </div>

            {/* NEXT EXAM */}

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

              <div className="text-sm text-gray-500 mb-3">
                Next exam
              </div>

              {nextExam ? (
                <>
                  <div className="text-2xl font-semibold">
                    {formatDate(
                      nextExam.date
                    )}
                  </div>

                  <div className="text-sm font-medium mt-2">
                    {
                      nextExam.courseCode
                    }
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    {
                      nextExam.name
                    }
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-semibold">
                    —
                  </div>

                  <div className="text-sm text-gray-500 mt-2">
                    No dated exam found
                  </div>
                </>
              )}
            </div>

            {/* COURSES */}

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

              <div className="text-sm text-gray-500 mb-3">
                Courses
              </div>

              <div className="text-3xl font-semibold">
                {courses.length}
              </div>

              <div className="text-sm text-gray-500 mt-2">
                {courses.length === 1
                  ? "course loaded"
                  : "courses loaded"}
              </div>
            </div>
          </div>

          {/* UPCOMING */}

          <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

            <div className="flex items-center justify-between mb-5">

              <div>
                <h3 className="text-lg font-semibold">
                  Upcoming
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Your next important
                  course dates.
                </p>
              </div>

              <span className="text-xs text-gray-400">
                Next 5
              </span>
            </div>

            {upcomingItems.length === 0 ? (
              <p className="text-sm text-gray-500">
                No upcoming dated
                events found.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">

                {upcomingItems.map(
                  (item, index) => (
                    <div
                      key={`${item.courseCode}-${item.name}-${item.date}-${index}`}
                      className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >

                      <div className="flex items-center gap-4">

                        <div className="w-14 text-center">

                          <div className="text-xs uppercase text-gray-400">
                            {formatMonth(
                              item.date
                            )}
                          </div>

                          <div className="text-xl font-semibold">
                            {getDayNumber(
                              item.date
                            )}
                          </div>
                        </div>

                        <div>

                          <div className="flex items-center gap-2 flex-wrap">

                            <p className="font-medium">
                              {
                                item.name
                              }
                            </p>

                            {item.derived && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                                Derived
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-500 mt-1">
                            {
                              item.courseCode
                            }

                            {item.weight !== null
                              ? ` • ${item.weight}%`
                              : ""}
                          </p>

                          {item.topic && (
                            <p className="text-sm text-gray-500 mt-1">
                              {
                                item.topic
                              }
                            </p>
                          )}

                          {(item.startTime ||
                            item.room) && (
                            <p className="text-xs text-gray-400 mt-1">
                              {item.startTime
                                ? `${formatTime(
                                    item.startTime
                                  )}${
                                    item.endTime
                                      ? ` – ${formatTime(
                                          item.endTime
                                        )}`
                                      : ""
                                  }`
                                : ""}

                              {item.startTime &&
                              item.room
                                ? " • "
                                : ""}

                              {item.room}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full capitalize">
                        {item.type}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* STUDY FOCUS */}

          <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-6">

            <div className="flex items-start gap-4">

              <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-semibold">
                ✦
              </div>

              <div className="flex-1">

                <h3 className="text-lg font-semibold text-gray-900">
                  Study focus
                </h3>

                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Based on upcoming
                  dates and assessment
                  weight.
                </p>

                {studyFocusItems.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Add dated
                    assessments to
                    generate your study
                    priorities.
                  </p>
                ) : (
                  <div className="space-y-4">

                    {studyFocusItems.map(
                      (item, index) => (
                        <div
                          key={`${item.courseCode}-${item.name}-${index}`}
                          className="flex gap-3"
                        >

                          <div className="text-indigo-600 font-semibold">
                            {index + 1}.
                          </div>

                          <div>

                            <p className="text-sm font-semibold">
                              {
                                item.courseCode
                              }{" "}
                              —{" "}
                              {
                                item.name
                              }
                            </p>

                            <p className="text-sm text-gray-600 mt-1">

                              {item.daysAway ===
                              0
                                ? "Today"
                                : item.daysAway ===
                                  1
                                ? "Tomorrow"
                                : `In ${item.daysAway} days`}

                              {item.weight !== null
                                ? ` • Worth ${item.weight}%`
                                : ""}
                            </p>

                            {item.topic && (
                              <p className="text-sm text-gray-500 mt-1">
                                {
                                  item.topic
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* ASK STUDYBUDDY */}
        {/* ================================================= */}

        <section className="max-w-5xl mx-auto mb-14">

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8">

            <div className="flex items-center justify-between gap-4 mb-5">

              <div>
                <h2 className="text-xl font-semibold">
                  Ask StudyBuddy
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Ask anything about
                  your semester.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap justify-end">

                <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                  {courses.length}{" "}
                  {courses.length === 1
                    ? "course"
                    : "courses"}{" "}
                  loaded
                </div>

                {schedule.length > 0 && (
                  <div className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">
                    Schedule connected
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">

              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleQuestion();
                  }
                }}
                placeholder="e.g. What do I have Monday?"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />

              <button
                onClick={
                  handleQuestion
                }
                className="bg-[#111827] text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition"
              >
                Ask
              </button>
            </div>

            {answer && (
              <div className="mt-5 rounded-2xl bg-[#f7f8fa] border border-gray-200 p-5">

                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-3">
                  StudyBuddy
                </div>

                <div className="text-sm leading-relaxed text-gray-800">

                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mt-4 mb-2">
                          {children}
                        </h1>
                      ),

                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold mt-4 mb-2">
                          {children}
                        </h2>
                      ),

                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mt-4 mb-2">
                          {children}
                        </h3>
                      ),

                      p: ({ children }) => (
                        <p className="mb-3">
                          {children}
                        </p>
                      ),

                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 mb-3 space-y-1">
                          {children}
                        </ul>
                      ),

                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 mb-3 space-y-1">
                          {children}
                        </ol>
                      ),

                      strong: ({ children }) => (
                        <strong className="font-semibold">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {answer}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* COURSES + SETUP */}
        {/* ================================================= */}

        <section className="grid lg:grid-cols-3 gap-6">

          {/* MY COURSES */}

          <div className="lg:col-span-2">

            <div className="mb-5">

              <h2 className="text-2xl font-semibold">
                My Courses
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                StudyBuddy combines
                your syllabi, lab
                documents, course
                information and
                schedule.
              </p>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">

                <p className="font-medium">
                  No courses yet
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Upload your first
                  course document to
                  get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">

                {courses.map(
                  (
                    course,
                    index
                  ) => (
                    <div
                      key={`${course.code}-${index}`}
                      className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm"
                    >

                      <div className="flex items-center gap-4">

                        <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                          {course.code.slice(
                            0,
                            3
                          )}
                        </div>

                        <div>

                          <div className="flex items-center gap-2">

                            <p className="font-semibold">
                              {
                                course.code
                              }
                            </p>

                            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                              Ready
                            </span>
                          </div>

                          <p className="text-sm text-gray-500 mt-1">
                            {
                              course.title
                            }
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          removeCourse(
                            index
                          )
                        }
                        className="text-sm text-gray-400 hover:text-red-600 transition"
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* SETUP COLUMN */}

          <div>

            {/* ADD COURSE DOCUMENTS */}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

              <div className="mb-5">

                <h2 className="text-lg font-semibold">
                  Add course documents
                </h2>

                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Upload syllabi,
                  lab schedules and
                  other PDFs. Documents
                  with the same course
                  code are combined.
                </p>
              </div>

              <label className="block border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl p-5 text-center cursor-pointer transition">

                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                />

                <div className="text-2xl mb-2">
                  ↑
                </div>

                <p className="text-sm font-medium">
                  Choose course PDFs
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Select multiple PDFs
                  at once
                </p>
              </label>

              {files.length > 0 && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3">

                  <p className="text-xs text-gray-500">
                    Selected files
                  </p>

                  <div className="mt-2 space-y-1">

                    {files.map(
                      (
                        file,
                        index
                      ) => (
                        <p
                          key={`${file.name}-${index}`}
                          className="text-sm font-medium truncate"
                        >
                          {
                            file.name
                          }
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={
                  handleUpload
                }
                className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
              >
                Add Course Documents
              </button>

              {message && (
                <p className="mt-4 text-sm text-center text-gray-600">
                  {message}
                </p>
              )}
            </div>

            {/* SCHEDULE */}

            <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

              <div className="flex items-start justify-between gap-3 mb-5">

                <div>
                  <h2 className="text-lg font-semibold">
                    Your schedule
                  </h2>

                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Upload your
                    timetable so
                    StudyBuddy knows
                    exactly when your
                    classes, labs and
                    tutorials happen.
                  </p>
                </div>

                {schedule.length > 0 && (
                  <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full whitespace-nowrap">
                    Connected
                  </span>
                )}
              </div>

              <label className="block border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl p-5 text-center cursor-pointer transition">

                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={
                    handleScheduleFileChange
                  }
                  className="hidden"
                />

                <div className="text-2xl mb-2">
                  ↑
                </div>

                <p className="text-sm font-medium">
                  Choose schedule
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  PDF, PNG, JPG or WebP
                </p>
              </label>

              {scheduleFile && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3">

                  <p className="text-xs text-gray-500">
                    Selected file
                  </p>

                  <p className="text-sm font-medium truncate mt-1">
                    {
                      scheduleFile.name
                    }
                  </p>
                </div>
              )}

              <button
                onClick={
                  handleScheduleUpload
                }
                className="w-full mt-4 bg-[#111827] text-white py-3 rounded-xl font-medium hover:bg-black transition"
              >
                {schedule.length > 0
                  ? "Update Schedule"
                  : "Connect Schedule"}
              </button>

              {scheduleMessage && (
                <p className="mt-4 text-sm text-center text-gray-600">
                  {
                    scheduleMessage
                  }
                </p>
              )}

              {schedule.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">

                  <p className="text-xs text-gray-500">
                    {
                      schedule.length
                    }{" "}
                    weekly class{" "}
                    {schedule.length === 1
                      ? "meeting"
                      : "meetings"}{" "}
                    loaded
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="mt-20 border-t border-gray-200 pt-8 pb-4 text-center text-sm text-gray-400">
          StudyBuddy — Your entire
          semester, one text away.
        </footer>
      </div>
    </main>
  );
}