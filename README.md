# Korean Add Calendar (Raycast)

한국어 자연어 문장을 파싱해서 Apple Calendar에 일정을 등록하는 Raycast 익스텐션입니다.

## 지원 예시

- `내일 오후 3시에 회의`
- `다음주 화요일 오전 10시 반에 강남에서 팀 미팅`
- `3월 12일 점심 12시 30분에 점심 약속`
- `오늘 19:00에 운동`

## 동작 규칙

- `/Users/hjm/Documents/parse.rb`의 정규식/날짜 계산 로직을 기준으로 TypeScript로 이식했습니다.
- 시간이 없으면 종일 일정으로 생성합니다.
- 파싱된 시작 시각이 이미 과거이면 7일 뒤로 보정합니다 (원본 스크립트와 동일).
- 캘린더 저장은 `assets/add_event.swift`에서 EventKit을 직접 호출합니다.
- 최초 1회 macOS 캘린더 권한 허용이 필요합니다.

## 개발

```bash
npm install
npm run typecheck
npm test
```

Raycast 개발 모드:

```bash
npx ray develop
```
