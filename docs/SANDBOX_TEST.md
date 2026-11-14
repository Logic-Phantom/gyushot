# 토스 환경 테스트 가이드 (devtools → QR)

> **SDK 3.x에는 샌드박스 앱이 없다.** 공식 문서(2026-11-14 확인):
> - https://developers-apps-in-toss.toss.im/development/test/sandbox.md — "현재 3.x 버전은 샌드박스 앱이 제공되지 않아요. 대신 devtools로 브라우저 개발"
> - https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x.md — 테스트 환경
> - https://developers-apps-in-toss.toss.im/guide/operation/toss.md — 번들 업로드 후 테스트 스킴(QR)
>
> 그래서 '샌드박스 확인'은 ① 로컬 devtools(모의 SDK) ② 콘솔 업로드 후 QR(`intoss-private://`)로 실제 토스 앱, 두 단계로 나눈다.

## 1단계 — 로컬 devtools (Claude가 실행 가능)

```bash
npm run dev
```

- 브라우저 오른쪽 아래 **AIT** 버튼 = devtools 패널. `@apps-in-toss/web-framework`가 모의 SDK로 바뀌고, 앱은 SDK 경로(앨범·저장·Storage)를 그대로 탄다(`__AIT_MOCK__`, D-022).
- 순수 브라우저 대체 경로(file input·다운로드)를 보려면 `AIT_DEVTOOLS=off npm run dev`.
- 패널에서 권한 거부·사진 모드(mock/web/prompt) 등을 바꿔 오류 경로를 시험할 수 있다.
- 프로덕션 빌드(`npm run build`)에는 devtools가 들어가지 않는다(dist 검색으로 확인).

| 항목 | 결과 (2026-11-14) |
|---|---|
| 진단 정보: 실행 환경 = devtools 모의 SDK, getAlbumItems·saveBase64 지원 | 확인 |
| 앨범 선택(`getAlbumItems`, base64) → 디코딩 | 확인 — 모의 SDK는 `data:` 접두 없는 base64 PNG(320×240)를 반환 → 바이트로 형식 판별하도록 수정 |
| 변환 → 결과 413×531 JPG 300dpi | 확인 |
| 토스 안에서는 앱 자체 뒤로가기 숨김(devtools에서는 표시) | 코드 반영(`isRealToss`) |
| `saveBase64` 모의 저장 | **미실행**(모의 구현이 파일 다운로드를 일으켜 클릭하지 않음) |
| 권한 거부 시나리오 | **미실행** — 패널에서 photos 권한을 거부로 바꾸고 확인 필요 |

## 2단계 — 실제 토스 앱 QR 테스트 (사용자 작업)

### 준비

1. 앱인토스 콘솔에서 앱 등록. 앱 이름 `제출맞춤`, appName은 `gyushot`(다르게 정해지면 `app/apps-in-toss.config.ts`와 `app/src/platform/toss.ts`의 `APP_NAME`을 같이 바꾼다).
2. 번들 만들기:

```bash
npm run build:ait
```

→ `app/gyushot.ait`

3. 업로드: 콘솔 → 앱 → 번들 업로드, 또는 콘솔 '키' 메뉴에서 API 키를 발급한 뒤

```bash
cd app && npx ait token add
```

```bash
cd app && npx ait deploy -m "QR 테스트"
```

4. 생성된 QR(`intoss-private://appsintoss?_deploymentId=…`)을 토스 앱으로 스캔.
5. 문제가 보이면 미니앱 오른쪽 위 더보기 → **웹 디버그 툴즈** → Log 탭에서 `[제출맞춤]` 로그 확인.

### 현재 상태 (2026-11-14)

- 콘솔 등록 완료: 제출맞춤 / `gyushot` (워크스페이스 41181)
- 번들 **20261114-1** 업로드 완료(deploymentId `01a1d964-1607-7ff8-8fad-0e0231a6252b`, 사용 권한: 사진첩)
- 번들 **20261114-2**(AI 예시 안내 포함) 업로드 후 사용자가 QR 테스트 완료 — 앨범 선택→변환→저장 '문제없음'(어느 OS·기기인지, 저장 위치는 기록되지 않음)
- QR: 콘솔 → 제출맞춤 → 앱 출시 → 앱 등록 화면의 **'토스앱 테스트'** 버튼. 테스트 푸시는 보내지 않았다.

### 점검표 (iOS·Android 각각 기록)

| # | 항목 | 확인 방법 | iOS | Android |
|---|---|---|---|---|
| 1 | 진입·온보딩·홈, 토스 내비게이션 바, 앱 자체 `<` 버튼 숨김 | 화면 확인 | ⬜ | ⬜ |
| 2 | 더보기 → 진단 정보: 실행 환경 '토스 앱', 토스 앱 버전, OS, deploymentId | 스크린샷 | ⬜ | ⬜ |
| 3 | 앨범 선택 첫 호출 시 권한 동의 창 | 여권 온라인 → 앨범에서 사진 선택 | ⬜ | ⬜ |
| 4 | 권한 거부 → 안내 문구, 예시 사진으로 계속 가능 | 동의 창에서 거부 | ⬜ | ⬜ |
| 5 | 선택 취소 → 아무 오류 없이 그대로 | 선택 화면에서 닫기 | ⬜ | ⬜ |
| 6 | 반환 형식: 진단 로그 `pick` 줄(접두/MIME, 바이트), `decode` 줄(형식·해상도·EXIF 방향) | 진단 정보 | ⬜ | ⬜ |
| 7 | 세로·가로로 찍은 사진의 방향이 맞는지(EXIF 중복 회전 없음) | 편집 화면 | ⬜ | ⬜ |
| 8 | 크롭 드래그·두 손가락 확대가 토스 제스처(뒤로 스와이프 등)와 충돌하지 않는지 | 편집 화면 | ⬜ | ⬜ |
| 9 | WebP 인코딩 지원 여부 | 진단 정보 '인코딩' | ⬜ | ⬜ |
| 10 | 변환 시간·결과 값 | 진단 로그 `convert` 줄 | ⬜ | ⬜ |
| 11 | **저장**: 성공 토스트, 저장 위치(사진 앱/파일 앱/공유 시트), 파일 이름 | 결과 → 저장하기 → 기기에서 찾기 | ⬜ | ⬜ |
| 12 | 저장 실패 시 오류 코드(→ `photos: write` 필요 여부 판단, D-012) | 진단 로그 `save` 줄 | ⬜ | ⬜ |
| 13 | 저장된 파일을 다시 열어 413×531·용량·JPG 확인 | 파일 정보 | ⬜ | ⬜ |
| 14 | 내 규격 저장 → 미니앱 완전 종료 → 재진입 후 유지(Storage) | 내 프리셋 | ⬜ | ⬜ |
| 15 | 하단 탭바·버튼이 홈 인디케이터/내비게이션과 겹치지 않음(Safe Area) | 화면 | ⬜ | ⬜ |
| 16 | 큰 사진(고해상도) 처리 중 흰 화면·멈춤 없음 | 최신 카메라 원본 | ⬜ | ⬜ |
| 17 | 뒤로가기: 편집 중 뒤로 → 사진 유지, 홈에서 뒤로 → 종료 | 내비게이션 바·Android 뒤로 | ⬜ | ⬜ |

결과는 이 표와 `docs/TESTING.md`, README 상태표의 '샌드박스/토스 iOS/토스 Android' 열에 적는다. 진단 정보 화면 스크린샷을 남기면 Claude가 바로 반영할 수 있다.
