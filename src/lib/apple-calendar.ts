import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ParsedSchedule } from "./parse-korean-schedule";

export interface CreateCalendarEventOptions {
  preferredCalendarName?: string;
}

const execFileAsync = promisify(execFile);

const PAYLOAD_ENV_KEY = "RAYCAST_KOREAN_CALENDAR_PAYLOAD";

const JXA_SCRIPT = `
ObjC.import("stdlib");

function isWritable(calendar) {
  try {
    return calendar.writable();
  } catch (_) {
    return false;
  }
}

const rawPayload = $.getenv("${PAYLOAD_ENV_KEY}");
if (!rawPayload) {
  throw new Error("Missing event payload");
}

const payload = JSON.parse(ObjC.unwrap(rawPayload));
const calendarApp = Application("Calendar");
calendarApp.includeStandardAdditions = true;

const writableCalendars = calendarApp.calendars().filter(isWritable);
if (writableCalendars.length === 0) {
  throw new Error("No writable calendar found");
}

let targetCalendar = writableCalendars[0];

if (payload.preferredCalendarName) {
  const matchedCalendar = writableCalendars.find((calendar) => {
    try {
      return calendar.name() === payload.preferredCalendarName;
    } catch (_) {
      return false;
    }
  });

  if (matchedCalendar) {
    targetCalendar = matchedCalendar;
  }
}

const eventProps = {
  summary: payload.title,
  startDate: new Date(payload.start),
  endDate: new Date(payload.end)
};

if (payload.location) {
  eventProps.location = payload.location;
}

if (payload.allDay) {
  eventProps.alldayEvent = true;
}

const createdEvent = calendarApp.Event(eventProps);
targetCalendar.events.push(createdEvent);

console.log(targetCalendar.name());
`;

export async function createAppleCalendarEvent(
  event: ParsedSchedule,
  options: CreateCalendarEventOptions = {},
): Promise<{ calendarName: string }> {
  const payload = JSON.stringify({
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    location: event.location,
    allDay: event.allDay,
    preferredCalendarName: options.preferredCalendarName,
  });

  try {
    const { stdout, stderr } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", JXA_SCRIPT], {
      env: {
        ...process.env,
        [PAYLOAD_ENV_KEY]: payload,
      },
      maxBuffer: 1024 * 1024,
    });

    if (stderr?.trim()) {
      throw new Error(stderr.trim());
    }

    return { calendarName: stdout.trim() || "알 수 없음" };
  } catch (error) {
    throw new Error(`Apple Calendar에 일정을 추가하지 못했습니다: ${toErrorMessage(error)}`);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
