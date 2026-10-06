import { NextResponse } from "next/server";
import pdf from "@cedrugs/pdf-parse";

function extractCourseInfo(text: string, fileName: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let courseCode = "";
  let courseTitle = "";

  for (const line of lines.slice(0, 30)) {
    const match = line.match(
      /\b([A-Z]{3}\s?\d{3})\s*[:\-–—]\s*(.+)/i
    );

    if (match) {
      courseCode = match[1].replace(/\s+/g, "").toUpperCase();
      courseTitle = match[2].trim();
      break;
    }
  }

  if (!courseCode) {
    const fileMatch = fileName.match(/\b([A-Z]{3}\s?\d{3})\b/i);

    if (fileMatch) {
      courseCode = fileMatch[1]
        .replace(/\s+/g, "")
        .toUpperCase();
    }
  }

  if (!courseTitle) {
    courseTitle = "Course";
  }

  return {
    courseCode,
    courseTitle,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: "No file received." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await pdf(buffer);

    const { courseCode, courseTitle } = extractCourseInfo(
      result.text,
      file.name
    );

    return NextResponse.json({
      message: `Read ${file.name} successfully!`,
      text: result.text,
      courseCode,
      courseTitle,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Failed to read PDF." },
      { status: 500 }
    );
  }
}