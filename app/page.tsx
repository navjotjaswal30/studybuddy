"use client";

import { useEffect, useState } from "react";

type Course = {
  code: string;
  title: string;
  text: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const savedCourses = localStorage.getItem("studybuddy-courses");

    if (savedCourses) {
      setCourses(JSON.parse(savedCourses));
    }

    setCoursesLoaded(true);
  }, []);

  useEffect(() => {
    if (coursesLoaded) {
      localStorage.setItem(
        "studybuddy-courses",
        JSON.stringify(courses)
      );
    }
  }, [courses, coursesLoaded]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setMessage("");
    }
  }

  async function handleUpload() {
    if (!file) {
      setMessage("Please choose a PDF first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setMessage("Reading syllabus...");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const newCourse = {
          code: data.courseCode || "COURSE",
          title:
            data.courseTitle ||
            file.name.replace(/\.pdf$/i, ""),
          text: data.text || "",
        };

        setCourses((previousCourses) => {
          const existingCourseIndex =
            previousCourses.findIndex(
              (course) =>
                course.code === newCourse.code
            );

          if (existingCourseIndex !== -1) {
            const updatedCourses = [...previousCourses];

            updatedCourses[existingCourseIndex] =
              newCourse;

            setMessage(
              `${newCourse.code} syllabus updated successfully.`
            );

            return updatedCourses;
          }

          setMessage(
            `${newCourse.code} added successfully.`
          );

          return [...previousCourses, newCourse];
        });
      } else {
        setMessage(
          data.message || "Failed to upload syllabus."
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        "Something went wrong while uploading the syllabus."
      );
    }
  }

  async function handleQuestion() {
    if (courses.length === 0) {
      setAnswer(
        "Upload at least one syllabus before asking a question."
      );
      return;
    }

    if (!question.trim()) {
      setAnswer("Ask me a question first.");
      return;
    }

    setAnswer("Thinking...");

    const combinedSyllabi = courses
      .map(
        (course) => `
COURSE:
${course.code} — ${course.title}

SYLLABUS:
${course.text}
`
      )
      .join(
        "\n\n---------------------------------\n\n"
      );

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          syllabusText: combinedSyllabi,
        }),
      });

      const data = await response.json();

      setAnswer(data.answer);
    } catch (error) {
      console.error(error);

      setAnswer(
        "Something went wrong while asking StudyBuddy."
      );
    }
  }

  function removeCourse(indexToRemove: number) {
    setCourses((previousCourses) =>
      previousCourses.filter(
        (_, courseIndex) =>
          courseIndex !== indexToRemove
      )
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#111827]">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold tracking-tight">
              StudyBuddy
            </span>
          </div>

          <div className="text-sm text-gray-500">
            Your semester, simplified.
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <section className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 mb-6">
            Your AI academic assistant
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Your entire semester,
            <span className="block text-indigo-600">
              one question away.
            </span>
          </h1>

          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload your course syllabi once. Ask
            StudyBuddy about deadlines, exams,
            office hours, course policies, and more.
          </p>
        </section>

        {/* Ask StudyBuddy */}
        <section className="max-w-3xl mx-auto mb-14">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Ask StudyBuddy
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Ask anything about your courses.
                </p>
              </div>

              <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                {courses.length}{" "}
                {courses.length === 1
                  ? "course"
                  : "courses"}{" "}
                loaded
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleQuestion();
                  }
                }}
                placeholder="e.g. How much is my COE318 midterm worth?"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />

              <button
                onClick={handleQuestion}
                className="bg-[#111827] text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition"
              >
                Ask
              </button>
            </div>

            {answer && (
              <div className="mt-5 rounded-2xl bg-[#f7f8fa] border border-gray-200 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">
                  StudyBuddy
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {answer.replace(/\*\*/g, "")}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Courses */}
        <section className="grid lg:grid-cols-3 gap-6">
          {/* Course List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-semibold">
                  My Courses
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  StudyBuddy uses these syllabi to
                  answer your questions.
                </p>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                <p className="font-medium">
                  No courses yet
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Upload your first syllabus to get
                  started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course, index) => (
                  <div
                    key={`${course.code}-${index}`}
                    className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                        {course.code.slice(0, 3)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {course.code}
                          </p>

                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                            Ready
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 mt-1">
                          {course.title}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        removeCourse(index)
                      }
                      className="text-sm text-gray-400 hover:text-red-600 transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Course */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Add a course
                </h2>

                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Upload a PDF syllabus and
                  StudyBuddy will automatically read
                  it.
                </p>
              </div>

              <label className="block border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl p-5 text-center cursor-pointer transition">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="text-2xl mb-2">
                  ↑
                </div>

                <p className="text-sm font-medium">
                  Choose syllabus
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  PDF files only
                </p>
              </label>

              {file && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">
                    Selected file
                  </p>

                  <p className="text-sm font-medium truncate mt-1">
                    {file.name}
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition"
              >
                Add Course
              </button>

              {message && (
                <p className="mt-4 text-sm text-center text-gray-600">
                  {message}
                </p>
              )}
            </div>

            {/* How It Works */}
            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">
                How it works
              </h3>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                    1
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Upload your syllabus
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      StudyBuddy reads your course
                      information.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                    2
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Ask anything
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Deadlines, exams, policies,
                      office hours and more.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                    3
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Get an instant answer
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      Answers are grounded in your
                      uploaded course information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-gray-200 pt-8 pb-4 text-center text-sm text-gray-400">
          StudyBuddy — Your entire semester, one text
          away.
        </footer>
      </div>
    </main>
  );
}