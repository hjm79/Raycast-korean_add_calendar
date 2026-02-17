import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createAppleCalendarEvent, listWritableCalendars, WritableCalendar } from "./lib/apple-calendar";
import { parseKoreanSchedule } from "./lib/parse-korean-schedule";

interface FormValues {
  sentence: string;
  calendarId: string;
}

export default function Command() {
  const [sentence, setSentence] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [calendars, setCalendars] = useState<WritableCalendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
  const [calendarLoadError, setCalendarLoadError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseResult = useMemo(() => {
    if (!sentence.trim()) {
      return null;
    }

    return parseKoreanSchedule(sentence);
  }, [sentence]);

  const loadCalendars = useCallback(async () => {
    setIsLoadingCalendars(true);
    setCalendarLoadError(undefined);

    try {
      const result = await listWritableCalendars();
      setCalendars(result.calendars);
      setCalendarId((current) => {
        if (current && result.calendars.some((calendar) => calendar.id === current)) {
          return current;
        }
        return result.defaultCalendarIdentifier ?? result.calendars[0]?.id ?? "";
      });
    } catch (error) {
      setCalendars([]);
      setCalendarId("");
      setCalendarLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  async function handleSubmit(values: FormValues) {
    if (!values.calendarId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "캘린더 선택 필요",
        message: "등록할 캘린더를 먼저 선택해 주세요.",
      });
      return;
    }

    const parsed = parseKoreanSchedule(values.sentence);
    if (!parsed.ok) {
      await showToast({
        style: Toast.Style.Failure,
        title: "파싱 실패",
        message: parsed.error,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAppleCalendarEvent(parsed.value, {
        preferredCalendarIdentifier: values.calendarId,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "일정 등록 완료",
        message: `캘린더: ${result.calendarName}`,
      });

      setSentence("");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "일정 등록 실패",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const parsedPreview = parseResult?.ok ? parseResult.value : undefined;

  return (
    <Form
      isLoading={isSubmitting || isLoadingCalendars}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues> icon={Icon.Calendar} title="Apple Calendar에 등록" onSubmit={handleSubmit} />
          <Action icon={Icon.ArrowClockwise} title="캘린더 목록 새로고침" onAction={() => void loadCalendars()} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sentence"
        title="일정 문장"
        placeholder="예) 다음주 화요일 오후 3시 반에 강남에서 팀 미팅"
        info="parse.rb 규칙 기반 파싱"
        value={sentence}
        onChange={setSentence}
      />

      <Form.Dropdown
        id="calendarId"
        title="캘린더"
        info="목록에서 등록할 캘린더를 선택하세요"
        value={calendarId}
        onChange={setCalendarId}
      >
        {isLoadingCalendars ? (
          <Form.Dropdown.Item value="" title="캘린더 목록 불러오는 중..." />
        ) : calendars.length > 0 ? (
          calendars.map((calendar) => (
            <Form.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={calendar.isDefault ? `${calendar.title} (기본)` : calendar.title}
              keywords={[calendar.sourceTitle]}
            />
          ))
        ) : (
          <Form.Dropdown.Item value="" title="선택 가능한 캘린더가 없습니다" />
        )}
      </Form.Dropdown>

      <Form.Separator />
      {calendarLoadError && <Form.Description title="캘린더 오류" text={calendarLoadError} />}
      <Form.Description
        title="파싱 상태"
        text={
          !parseResult
            ? "문장을 입력하면 미리보기를 표시합니다."
            : parseResult.ok
              ? "등록 가능"
              : `오류: ${parseResult.error}`
        }
      />

      {parsedPreview && (
        <>
          <Form.Description title="제목" text={parsedPreview.title} />
          <Form.Description title="시작" text={formatDate(parsedPreview.start, parsedPreview.allDay)} />
          <Form.Description title="종료" text={formatDate(parsedPreview.end, parsedPreview.allDay)} />
          <Form.Description title="장소" text={parsedPreview.location || "(없음)"} />
          <Form.Description title="유형" text={parsedPreview.allDay ? "종일" : "시간 지정"} />
        </>
      )}
    </Form>
  );
}

function formatDate(value: Date, allDay: boolean): string {
  if (allDay) {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(value);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}
