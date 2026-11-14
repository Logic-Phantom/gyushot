# 라이선스

## 런타임 의존성

`npm run licenses`(빌드 시 자동)가 `app/package.json` dependencies 트리를 따라 `app/src/legal/oss-licenses.json`을 만든다. 허용 목록(MIT·ISC·BSD·Apache-2.0·0BSD·Unlicense·CC0·BlueOak) 밖이면 빌드 실패.
2026-11-14 결과: 13개 — MIT 11, ISC 1, Apache-2.0 1. GPL/AGPL 없음. 앱의 더보기 → 오픈소스 라이선스에서 표시.
워크스페이스 자체 코드(`@gyushot/*`)와 빌드 전용 `@apps-in-toss/cli`는 제외.

이미지 처리 외부 라이브러리는 쓰지 않는다(EXIF·DPI·형식 판별을 직접 구현).

## 에셋

| 에셋 | 출처 | 라이선스 |
|---|---|---|
| 로고·아이콘(`public/brand/logo.svg`, `components/Icon.tsx`) | 자체 제작(시안 모양 참고) | 프로젝트 소유 |
| 디자인 시안 `assets/design/ui-mockup.webp` | 사용자 제공 | 사용자 소유 |
| 예시 사진 `assets/design/sample-photos-sheet.webp` → `app/public/samples/*.jpg` | 사용자 제공 시트를 분할 | 사용자 제공 — **출시 전 원본 이미지의 상업적 사용 권리 확인 필요**(생성 이미지로 보이며 실제 인물 여부·권리 확인 필요) |
| 테스트 fixture | `scripts/make-test-fixtures.py`로 생성한 단색 합성 이미지 | 프로젝트 소유 |
| 폰트 | 시스템 폰트만 사용 | — |
