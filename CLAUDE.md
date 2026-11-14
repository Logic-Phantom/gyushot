# 제출맞춤(gyushot) 작업 규칙

원본 지시서: `docs/SUPER_PROMPT.md`가 없으면 사용자 다운로드 폴더의 `gyushot-super-prompt.md`(2026-11-11). 결정은 `docs/DECISIONS.md`.

- 시작 전 앱인토스 공식 문서(https://developers-apps-in-toss.toss.im/llms.txt)와 설치된 SDK 타입(`node_modules/@apps-in-toss/web-framework/dist/index.d.ts`)을 읽는다. 타입에 없는 함수는 쓰지 않는다.
- 공식 규격은 기관의 현재 공식 페이지를 기준으로 하고, `presets.ko-KR.json`의 `source`(기관·URL·확인일·근거)와 `docs/PRESET_SOURCES.md`를 같이 고친다. 확인 못 한 값은 `needs-review` + `enabled:false`.
- 확인하지 않은 API·규격·지원 포맷을 추측하지 않는다.
- 사진 원본·결과를 네트워크로 보내지 않는다. 사진을 Storage/localStorage/서버에 저장하지 않는다.
- `packages/image-core/src/*.ts`(browser 폴더 제외)는 DOM·SDK에 의존하지 않는다.
- 원본 파일을 덮어쓰지 않는다. 변환 성공 여부는 결과 Blob을 다시 읽은 값으로 판단한다.
- 파일 조건(픽셀·용량·형식)과 사진 내용 심사를 구분한다. "제출 가능", "심사 통과" 같은 표현 금지.
- 여권·신분증 사진에 배경 합성·얼굴 보정·AI 변형 기능을 넣지 않는다.
- UI에서 공식/일반/MY를 구분한다. 색·간격은 `app/src/styles/tokens.css` 변수만 쓴다. 시안: `assets/design/ui-mockup.webp`.
- 상태는 `구현` / `자동 테스트 통과` / `브라우저 확인` / `샌드박스 확인` / `토스 iOS 확인` / `토스 Android 확인`으로 구분하고, 테스트하지 않은 것을 완료로 쓰지 않는다.
- 작업이 끝나면 README 상태표·변경 내역·Work Log와 `docs/TESTING.md`를 갱신한다.
- 사용자 승인 없이 콘솔 업로드·출시 요청을 하지 않는다. (커밋·푸시는 사용자가 요청한 경우에만)
- 다른 프로젝트(saeit, WhereIsCar 등)는 구조만 참고하고 수정·import하지 않는다.

## 명령

```bash
npm run dev               # http://localhost:5173 + devtools 모의 SDK(AIT 패널). AIT_DEVTOOLS=off면 순수 브라우저 경로
npm run check             # typecheck + test + presets:validate + build
npm run build:ait         # app/gyushot.ait
python scripts/split-sample-photos.py   # 예시 사진 다시 분할
python scripts/make-test-fixtures.py    # 테스트 fixture 다시 생성
```
