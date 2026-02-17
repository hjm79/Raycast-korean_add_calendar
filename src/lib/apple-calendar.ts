import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { ParsedSchedule } from "./parse-korean-schedule";

export interface CreateCalendarEventOptions {
  preferredCalendarIdentifier?: string;
}

export interface WritableCalendar {
  id: string;
  title: string;
  sourceTitle: string;
  isDefault: boolean;
}

interface ListCalendarsOutput {
  defaultCalendarIdentifier?: string;
  calendars: Array<{
    id: string;
    title: string;
    sourceTitle: string;
  }>;
}

interface EventKitPayload {
  title: string;
  startEpochMs: number;
  endEpochMs: number;
  location?: string;
  allDay: boolean;
  preferredCalendarIdentifier?: string;
}

const execFileAsync = promisify(execFile);
const ADD_EVENT_SCRIPT_PATH = path.join(environment.assetsPath, "add_event.swift");
const LIST_CALENDARS_SCRIPT_PATH = path.join(environment.assetsPath, "list_calendars.swift");

export async function listWritableCalendars(): Promise<{
  calendars: WritableCalendar[];
  defaultCalendarIdentifier?: string;
}> {
  const stdout = await runSwiftScript(LIST_CALENDARS_SCRIPT_PATH);
  const parsed = parseListCalendarsOutput(stdout);
  const defaultCalendarIdentifier = parsed.defaultCalendarIdentifier;
  const calendars = parsed.calendars.map((calendar) => ({
    ...calendar,
    isDefault: calendar.id === defaultCalendarIdentifier,
  }));

  return {
    calendars,
    defaultCalendarIdentifier,
  };
}

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
    preferredCalendarIdentifier: options.preferredCalendarIdentifier,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

  try {
    const stdout = await runSwiftScript(ADD_EVENT_SCRIPT_PATH, [encodedPayload]);
    return { calendarName: stdout || "알 수 없음" };
  } catch (error) {
    throw new Error(`Apple Calendar에 일정을 추가하지 못했습니다: ${toErrorMessage(error)}`);
  }
}

async function runSwiftScript(scriptPath: string, args: string[] = []): Promise<string> {
  await access(scriptPath);

  const { stdout } = await execFileAsync("swift", [scriptPath, ...args], {
    maxBuffer: 1024 * 1024,
  });

  return stdout.trim();
}

function parseListCalendarsOutput(stdout: string): ListCalendarsOutput {
  try {
    const parsed = JSON.parse(stdout) as ListCalendarsOutput;
    if (!Array.isArray(parsed.calendars)) {
      throw new Error("Invalid calendars payload");
    }
    return parsed;
  } catch (error) {
    throw new Error(`캘린더 목록 응답을 파싱하지 못했습니다: ${toErrorMessage(error)}`);
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
