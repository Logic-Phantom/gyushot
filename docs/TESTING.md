# 테스트 기록

## 명령

```bash
npm run typecheck        # image-core + app (tsc --noEmit)
npm test                 # image-core 57개 + app 9개 (Vitest, Node)
npm run presets:validate # 카탈로그 스키마·출처 검증
npm run build            # 라이선스 수집 + tsc + vite build
npm run build:ait        # .ait 패키징
```

## 2026-11-14 실행 결과 (Windows 11, Node 24.20.0, npm 11.19.0)

| 항목 | 결과 |
|---|---|
| typecheck | 통과(exit 0) |
| image-core 단위 테스트 | 57/57 통과 |
| app 테스트 | 9/9 통과 |
| presets:validate | 8개 프리셋 통과 |
| build | 통과 (JS 111KB + vendor 380KB, gzip 35KB + 119KB) |
| build:ait | `app/gyushot.ait` 생성 (약 445KB) |

### 단위 테스트가 다루는 것

cm/mm→px(72/150/300/600dpi, 413×531·354×472·591×827), 비율 표기, cover/contain 크롭(가로·세로·정사각, 왜곡 없음, 경계 보정), 회전 0/90/180/270 행렬, 확대 경고, 드래그·확대 보정, 형식 판별(JPG/PNG/WebP lossy·lossless/텍스트 위장), 헤더 크기, EXIF Orientation 1~8, JPEG/PNG DPI 쓰기·다시 읽기, 품질 이분 탐색(상한 경계·불가능·상한 없음), 500,000/500,001 bytes 경계, 허용 픽셀 범위, 형식 불일치, EXIF 잔존, 사진 내용 경고, 잘못된 카탈로그 거부(출처 누락·음수 픽셀·잘못된 형식·일반을 verified로·검증대기 활성·id 중복), 사용자 프리셋 저장·손상 복구·v0→v1 이전, 최근 작업 20개 제한·사진 데이터 미포함.

Fixture는 `scripts/make-test-fixtures.py`로 만든 합성 이미지(개인정보 없음).

## 브라우저 확인 (Claude 데스크톱 내장 Chromium, 375×812 / 360×780) — **브라우저 확인**

| 흐름 | 결과 |
|---|---|
| 첫 실행 → 온보딩 → 홈 | 통과, 재방문 시 홈 바로 진입 |
| 홈 '여권사진' → 규격 상세 → 예시 사진 → 편집 → 세부 설정 → 변환 → 결과 | 413×531 · 20KB · JPG · 300dpi(결과 파일 재확인), EXIF 없음 |
| 반명함 + 90° 회전 → 변환 | 354×472 · 300dpi |
| 확대 도구 125%, 회전 시 초기화 | 통과 |
| 3000×4000 노이즈 이미지 JPG ≤150KB / PNG / WebP | 통과(IMAGE_PIPELINE.md) |
| 내 규격 만들기(450×600, 300KB) → 새로고침 후 유지 | 통과 |
| 360px 8개 화면 가로 스크롤 | 없음 |
| 콘솔 오류 | 없음 |
| 네트워크 | localhost 요청만 |

## devtools 모의 SDK 확인 (2026-11-14) — 상세: [SANDBOX_TEST.md](SANDBOX_TEST.md)

| 흐름 | 결과 |
|---|---|
| 진단 정보(모의 SDK 인식, getAlbumItems·saveBase64 지원 표시) | 통과 |
| `Device.getAlbumItems`(base64) → 디코딩 → 변환 413×531 JPG 300dpi | 통과 |
| 진단 로그에 사진 내용 없이 결과만 기록 | 통과 |
| 프로덕션 dist에 devtools 코드 없음 | 통과 |
| 모의 `saveBase64`, 권한 거부 시나리오 | 미실행 |

## 실행하지 않은 것

- **자동 E2E(Playwright)**: 미도입. 위 브라우저 흐름은 수동(도구) 확인이다.
- **브라우저 '저장하기' 다운로드 클릭**: 미실행(다운로드 동작 자체는 코드만 작성).
- **실제 파일 선택(<input type=file>)·HEIC 입력**: 미실행. 예시 사진 경로로만 확인.
- **EXIF Orientation 실제 사진의 브라우저 디코딩**: 바이트 판독만 단위 테스트, 렌더 결과 미확인.
- **샌드박스 앱**: SDK 3.x는 제공하지 않음(devtools로 대체). **QR(실제 토스 앱)**: 미확인. **토스 iOS / Android**: 미확인(앨범 선택, 권한 거부, 저장 위치, 한글 파일명, 대용량, 제스처 충돌, Safe Area).
