import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { ParsedSchedule } from "./parse-korean-schedule";

export interface CreateCalendarEventOptions {
  preferredCalendarName?: string;
}

interface EventKitPayload {
  title: string;
  startEpochMs: number;
  endEpochMs: number;
  location?: string;
  allDay: boolean;
  preferredCalendarName?: string;
}

const execFileAsync = promisify(execFile);
const SWIFT_SCRIPT_NAME = "add_event.swift";
const SWIFT_SCRIPT_PATH = path.join(environment.assetsPath, SWIFT_SCRIPT_NAME);

export async function createAppleCalendarEvent(
  event: ParsedSchedule,
  options: CreateCalendarEventOptions = {},
): Promise<{ calendarName: string }> {
  const payload: EventKitPayload = {
    title: event.title,
    startEpochMs: event.start.getTime(),
    endEpochMs: event.end.getTime(),
    location: event.location,
    allDay: event.allDay,
    preferredCalendarName: options.preferredCalendarName,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

  try {
    await access(SWIFT_SCRIPT_PATH);

    const { stdout } = await execFileAsync("swift", [SWIFT_SCRIPT_PATH, encodedPayload], {
      maxBuffer: 1024 * 1024,
    });

    return { calendarName: stdout.trim() || "알 수 없음" };
  } catch (error) {
    throw new Error(`Apple Calendar에 일정을 추가하지 못했습니다: ${toErrorMessage(error)}`);
  }
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = String((error as { stderr?: string }).stderr ?? "").trim();
    if (stderr) {
      return stderr.replace(/^ERROR:\s*/u, "");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
