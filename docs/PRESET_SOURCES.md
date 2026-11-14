# 프리셋 출처

데이터: `app/src/data/presets.ko-KR.json` · 검증: `npm run presets:validate`. 모든 확인일 2026-11-14(공식 페이지를 직접 받아 문구 확인).

## 분류

| 라벨 | kind | 의미 |
|---|---|---|
| 공식 | `official-online` | 기관이 픽셀·용량·형식을 명시한 온라인 제출 규격 |
| 공식 | `official-print` | 기관이 인화 크기(cm)를 명시. 픽셀은 사용자가 고른 DPI로 환산(기관 필수값 아님) |
| 일반 | `common-print` | 널리 쓰이는 인화 크기. 기관 규격으로 표시하지 않음 |
| MY | `custom` | 사용자가 만든 규격(기기에만 저장) |

## 프리셋별 근거

| ID | 상태 | 기관 · URL | 근거 문구(요지) | 적용 필드 |
|---|---|---|---|---|
| `passport-online-kr` | verified | 외교부 여권안내 · https://www.passport.go.kr/home/kor/contents.do?menuPos=12 | 파일 크기 500KB 이하, JPG/JPEG, 413×531px 권장(가로 395~431, 세로 507~550px 이내만 업로드), 300dpi 권장, 6개월 이내 촬영 | widthPx/heightPx, min/max, maxBytes 500000, acceptedFormats jpeg, dpi 300 |
| `passport-print-kr` | verified | 외교부 · https://www.passport.go.kr/home/kor/contents.do?menuPos=32 | 가로 3.5 × 세로 4.5cm, 머리 길이 3.2~3.6cm, 6개월 이내 | widthMm 35, heightMm 45 |
| `driver-license-online-kr` | verified | 한국도로교통공단 · https://www.safedriving.or.kr/commonManage/selectCommonPhotoRulePop.do | 온라인 신청 시 500KB 이하 JPG(300dpi 권장), 413×531 권장(395~431×507~550 이내만 업로드) | 여권 온라인과 같은 값 |
| `driver-license-print-kr` | verified | 같은 페이지 | 6개월 이내 3.5×4.5cm 탈모·상반신·흰색 배경 컬러, AI·편집 합성 불인정 | widthMm 35, heightMm 45 |
| `id-print-generic` (주민등록증) | general | — | 일반 3.5×4.5cm 인화 크기. 행정안전부 안내 미확인(D-020) | widthMm 35, heightMm 45 |
| `half-print-generic` (증명사진) | general | — | 3×4cm 반명함판 | widthMm 30, heightMm 40 |
| `namecard-print-generic` (명함사진) | general | — | 5×7cm 명함판 | widthMm 50, heightMm 70 |
| `qnet-online-kr` | needs-review(비활성) | Q-Net · https://mo.q-net.or.kr/rcv002.do?gSite=Q&id=rcv002_licenseInfo | 페이지가 스크립트로 렌더링돼 문구 미확인. 300×400px은 슈퍼프롬프트 후보값 | — |

## 페이지 간 비교

- **여권 온라인(menuPos=12) vs 규격 안내(menuPos=32)**: menuPos=32는 "온라인 신청용 여권사진은 413×531 pixel 권장"만 있고 용량·형식은 menuPos=12에만 있다. 프리셋은 menuPos=12(업로드 규격)를 따른다.
- **여권 사진검증 페이지(onlinePhotoVerify)**: 이번 확인에서 받지 않았다. 슈퍼프롬프트가 언급한 JPEG/PNG 표기 차이는 **미확인** — 업로드 페이지 기준 JPG만 허용으로 둔다.
- **도로교통공단**: 온라인 신청 기준이 외교부 온라인 규격과 같은 값으로 명시돼 있다. 슈퍼프롬프트 작성 시점(2026-11-11)엔 "별도 안내가 없으면 만들지 않는다"였으나 이번에 확인돼 추가(D-019).

## 변경 이력

| 날짜 | ID | 변경 | 이전 값 |
|---|---|---|---|
| 2026-11-14 | 전체 | 최초 등록 | — |
