# 아키텍처

```text
[사용자]
   │ 탭(권한 요청은 '앨범에서 사진 선택'을 누를 때만)
   ▼
[앱인토스 WebView / React UI — app/]
   ├─ data/presets.ko-KR.json  ← 공식·일반 카탈로그(출처·확인일 포함)
   ├─ storage/  (Toss Storage | localStorage)  ← 내 프리셋·즐겨찾기·최근 작업 요약만
   ├─ platform/ image-picker  (Device.getAlbumItems → getPhotos | <input type=file>)
   │            image-saver   (File.saveBase64 | Blob 다운로드)
   ▼
[packages/image-core]
   ├─ 순수(src/*.ts, DOM·SDK 비의존, Node 테스트)
   │   units      cm/mm↔px, resolveSpec(프리셋 → 출력 픽셀·제약)
   │   crop       planCrop(cover/contain·회전·확대·이동) → 아핀 행렬
   │   compress   searchQuality(상한 이하 최대 품질 이분 탐색, 인코더 주입)
   │   metadata   형식 판별, 헤더 크기, EXIF Orientation, JFIF/pHYs DPI 읽기·쓰기
   │   validate   validateOutput(다시 읽은 파일 값 vs 규격)
   │   presets    카탈로그·사용자 프리셋 스키마 검증, v0→v1 이전·손상 복구
   └─ browser/   (Canvas·createImageBitmap 어댑터)
       decodeSource → renderToCanvas → encodeCanvas(+DPI) → convert(압축 탐색) → inspectBlob → validateOutput
```

## 디렉터리

```text
gyushot/
├─ app/                      앱인토스 WebView 앱 (Vite, base './')
│  ├─ apps-in-toss.config.ts appName gyushot, photos:read, 토스 내비게이션 바
│  ├─ public/brand/logo.svg  자체 제작 로고
│  ├─ public/samples/        예시 사진 16장(시트 분할 결과) + manifest.json
│  ├─ src/app/App.tsx        해시 라우터
│  ├─ src/brand.ts           이름·카피
│  ├─ src/components/        Icon(자체 SVG 아이콘), ui(헤더·탭바·버튼·토글·세그먼트·토스트)
│  ├─ src/data/              presets.ko-KR.json, catalog.ts(화면용 AppPreset), samples.ts
│  ├─ src/features/          home(온보딩·홈), preset-select, photo-select, crop-editor,
│  │                         export-settings(+변환 중 오버레이), result, custom-presets, recent, settings
│  ├─ src/platform/          toss.ts, image-picker.ts, image-saver.ts
│  ├─ src/state/AppState.tsx 저장 상태 + 메모리 세션(사진·편집·설정·결과)
│  ├─ src/storage/           kv.ts, preset-repository.ts
│  ├─ src/styles/            tokens / global / components / screens
│  └─ tests/                 카탈로그·저장소 테스트
├─ packages/image-core/      위 구조. tests/fixtures는 스크립트로 만든 합성 이미지
├─ scripts/                  validate-presets, split-sample-photos, make-test-fixtures,
│                            generate-oss-licenses, bundle-size
├─ assets/design/            사용자 제공 시안(ui-mockup.webp)·예시 사진 시트
└─ docs/
```

슈퍼프롬프트의 구조에서 바꾼 점:
- `router.tsx`·`providers/`를 따로 두지 않고 `App.tsx` 하나로(화면 12개라 분리 이득이 작음).
- `components/preset|editor|result`를 만들지 않고 화면 컴포넌트를 `features/*`에 둠(재사용 단위가 생기면 분리).
- `storage/migrations.ts` 대신 스키마 이전을 image-core `presets.ts`(`parseCustomPresetStore`)에 두어 Node에서 테스트.
- `features/recent` 추가(시안 탭바의 '최근 작업').

## 화면 흐름

`/welcome`(첫 실행) → `/`(홈) → `/presets`(규격 목록) → `/preset/:key`(규격 상세·사진 선택) → `/edit`(크롭) → `/export`(세부 설정·변환) → `/result`.
탭바: 홈 `/` · 내 프리셋 `/my` · 최근 작업 `/recent` · 더보기 `/more`. 직접 설정: `/my/new?use=1`.

## 상태

- **저장(기기)**: 내 프리셋(버전 있는 JSON), 즐겨찾기 키, 최근 작업 요약(규격·픽셀·용량·형식·시각), 온보딩 완료 여부.
- **메모리(세션)**: 선택 규격 키, 원본 `ImageBitmap`·Object URL, 편집 상태(회전·확대·중심), 내보내기 설정, 결과 Blob·URL.
  사진을 바꾸거나 세션을 지우면 `bitmap.close()`·`URL.revokeObjectURL()`로 즉시 해제. 앱을 다시 열면 사진은 다시 골라야 한다.

## 렌더링

출력 좌표 = 아핀 행렬 × 원본 좌표(`planToMatrix`). 같은 행렬을 미리보기 캔버스(프레임 배율·DPR 반영)와 최종 캔버스에 써서 화면과 결과가 일치한다.
큰 축소는 절반씩 줄여(`prescale`) 계단 현상을 줄이고, 가로·세로에 같은 배율만 쓰므로 왜곡이 없다(테스트로 확인).
