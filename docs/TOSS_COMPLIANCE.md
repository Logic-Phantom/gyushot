# 앱인토스 비게임 체크리스트 대응

기준: https://developers-apps-in-toss.toss.im/checklist/app-nongame.md, SDK 문서(앨범·파일 저장·Storage) — 2026-11-14 확인. SDK `@apps-in-toss/web-framework` 3.10.0 타입 정의 확인.
상태: `구현` / `샌드박스 확인` / `토스 iOS 확인` / `토스 Android 확인` / `해당 없음` / `검토 필요`. **실제 토스 앱(QR) 확인은 아직 하나도 없다.** SDK 3.x는 샌드박스 앱을 제공하지 않아 devtools 모의 SDK로 대신 확인했다([SANDBOX_TEST.md](SANDBOX_TEST.md)).

| 항목 | 대응 | 상태 |
|---|---|---|
| 토스 내비게이션 바 사용 | `navigationBar: { withBackButton, withHomeButton }` | 구현 |
| 두 뒤로가기 동시 노출 금지 | 토스 안에서는 앱 헤더의 `<` 숨김(D-005) | 구현(토스앱 미확인) |
| 자체 로고 과다 노출 | 시안 재현을 위해 홈 상단에 텍스트 로고 `제출맞춤`, 온보딩에 로고. 검수에서 지적되면 홈 텍스트 로고 제거 | 검토 필요 |
| CSR/SSG만, eval·iframe 금지 | Vite CSR, eval·iframe 없음 | 구현 |
| 타 도메인 이동 금지 | 외부 링크 없음(출처 URL은 텍스트로만 표시) | 구현 |
| HTTPS·네트워크 | 런타임 외부 요청 없음(예시 사진도 번들 포함) | 구현 · 브라우저 확인 |
| 라이트 모드 | `color-scheme: light` | 구현 |
| 핀치줌 비활성 | viewport `user-scalable=no`. 크롭 확대는 자체 핀치(`touch-action:none`) | 구현(제스처 충돌 실기기 미확인) |
| 진입 즉시 권한 요청·바텀시트 금지 | 온보딩은 첫 실행 1회 전체 화면(모달 아님). 앨범 권한은 '앨범에서 사진 선택' 탭 시에만 | 구현 |
| 권한 선언 최소화 | `photos: read`만. saveBase64 권한 문서 미명시(D-012) | 구현(샌드박스 확인 필요) |
| 권한 거부 처리 | `NOT_ALLOWED`/`PERMISSION_DENIED`/`FetchAlbumPhotosPermissionError` → 안내 문구, 예시 사진으로 계속 가능 | 구현(토스앱 미확인) |
| 미지원 앱 버전 | `getAlbumItems.isSupported()` → `getPhotos` 대체, `File.saveBase64.isSupported()` 실패 시 업데이트 안내 | 구현 |
| 2초 이상 지연 금지 | 변환은 단계 표시 오버레이(최소 0.9초), 실측 수백 ms(데스크톱) | 구현(실기기 미측정) |
| 저장 성공 확인 전 성공 토스트 금지 | `saveBase64` resolve 후에만 토스트. 브라우저는 '다운로드를 시작했어요' | 구현 |
| Safe Area | 하단 탭바·버튼에 `env(safe-area-inset-bottom)` | 구현(실기기 미확인) |
| 360px 가로 스크롤 없음 | 8개 화면 `scrollWidth == 360` 확인 | 브라우저 확인 |
| 광고·로그인·결제 | 사용 안 함 | 해당 없음 |
| 국문 앱 이름 = 콘솔 등록명 | 콘솔 등록 `제출맞춤`, appName `gyushot`(D-026) | 구현 |
| 공식 기관 로고·휘장 미사용 | 아이콘·로고 자체 제작 | 구현 |
| devtools 모의 SDK 테스트(3.x 테스트 환경) | `@apps-in-toss/devtools` Vite 플러그인, dev에서만 활성 | 구현 · devtools 확인 |
| `brand` 설정 삭제(3.x) | 삭제(D-023) | 구현 |
| `.ait` 생성 | `npm run build:ait` → `app/gyushot.ait`(약 445KB) | 구현 |
