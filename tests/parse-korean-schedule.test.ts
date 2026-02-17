import { describe, expect, it } from "vitest";

import { parseKoreanSchedule } from "../src/lib/parse-korean-schedule";

describe("parseKoreanSchedule", () => {
  const baseNow = new Date(2026, 1, 17, 9, 0, 0, 0);

  it("parses relative day with time", () => {
    const result = parseKoreanSchedule("내일 오후 3시에 회의", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("회의");
    expect(result.value.allDay).toBe(false);
    expectDate(result.value.start, { year: 2026, month: 2, day: 18, hour: 15, minute: 0 });
  });

  it("parses week modifier, weekday, minute and location", () => {
    const result = parseKoreanSchedule("다음주 화요일 오후 3시 반에 강남에서 팀 미팅", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.title).toBe("팀 미팅");
    expect(result.value.location).toBe("강남");
    expectDate(result.value.start, { year: 2026, month: 2, day: 24, hour: 15, minute: 30 });
  });

  it("creates all-day event when time is omitted", () => {
    const result = parseKoreanSchedule("오늘 휴가", { now: baseNow });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.allDay).toBe(true);
    expectDate(result.value.start, { year: 2026, month: 2, day: 17, hour: 0, minute: 0 });
    expectDate(result.value.end, { year: 2026, month: 2, day: 18, hour: 0, minute: 0 });
  });

  it("moves past time by 7 days like parse.rb", () => {
    const result = parseKoreanSchedule("오늘 오후 3시에 회의", { now: new Date(2026, 1, 17, 16, 0, 0, 0) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectDate(result.value.start, { year: 2026, month: 2, day: 24, hour: 15, minute: 0 });
  });

  it("fails when sentence does not match pattern", () => {
    const result = parseKoreanSchedule("회의 잡아줘", { now: baseNow });

    expect(result.ok).toBe(false);
  });
});

function expectDate(
  value: Date,
  expected: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
) {
  expect(value.getFullYear()).toBe(expected.year);
  expect(value.getMonth() + 1).toBe(expected.month);
  expect(value.getDate()).toBe(expected.day);
  expect(value.getHours()).toBe(expected.hour);
  expect(value.getMinutes()).toBe(expected.minute);
}
