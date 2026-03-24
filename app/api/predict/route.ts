import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputJson = JSON.stringify(body);

    const pythonExecutable = path.resolve("karpeta/venv/Scripts/python.exe");
    const scriptPath = path.resolve("karpeta/run_prediction.py");

    return new Promise((resolve) => {
      const child = spawn(pythonExecutable, [scriptPath]);
      let stdoutData = "";
      let stderrData = "";

      child.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });
      child.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      child.on("close", (code) => {
        try {
          const result = JSON.parse(stdoutData.trim());
          if (result.success) {
            resolve(NextResponse.json(result));
          } else {
            resolve(
              NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
              )
            );
          }
        } catch (e) {
          console.error("Python Script Output:", stdoutData);
          console.error("Python Script Error:", stderrData);
          resolve(
            NextResponse.json(
              { success: false, error: "Failed to parse Python result" },
              { status: 500 }
            )
          );
        }
      });

      // Write data to the python process standard input and close it
      child.stdin.write(inputJson);
      child.stdin.end();
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
