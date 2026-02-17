import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useMemo, useState } from "react";

import { createAppleCalendarEvent } from "./lib/apple-calendar";
import { parseKoreanSchedule } from "./lib/parse-korean-schedule";

interface FormValues {
  sentence: string;
  calendarName?: string;
}

export default function Command() {
  const [sentence, setSentence] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseResult = useMemo(() => {
    if (!sentence.trim()) {
      return null;
    }

    return parseKoreanSchedule(sentence);
  }, [sentence]);

  async function handleSubmit(values: FormValues) {
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
        preferredCalendarName: values.calendarName?.trim() || undefined,
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
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues> icon={Icon.Calendar} title="Apple Calendar에 등록" onSubmit={handleSubmit} />
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

      <Form.TextField
        id="calendarName"
        title="캘린더 이름 (선택)"
        placeholder="비워두면 기본 캘린더"
        info="원하는 캘린더 이름을 정확히 입력하면 해당 캘린더에 등록"
        value={calendarName}
        onChange={setCalendarName}
      />

      <Form.Separator />
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
