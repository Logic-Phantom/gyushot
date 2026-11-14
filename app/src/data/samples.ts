// 예시 사진: 디자인 시트(assets/design/sample-photos-sheet.webp)를 scripts/split-sample-photos.py로 나눈 파일.
// 앱에 함께 포함되는 정적 파일이라 네트워크 외부 전송이 없다.
// 모두 사용자가 ChatGPT로 생성한 AI 이미지다(실존 인물 아님, D-027). 기관 제출용 사진이 아니라 체험용임을 화면에 표시한다.
export interface Sample {
  id: string;
  file: string;
  alt: string;
}

const s = (id: string, alt: string): Sample => ({ id, file: `./samples/${id}.jpg`, alt });

export const ID_SAMPLES: Sample[] = [
  s('id-woman-sweater', '흰 배경 증명사진 예시(여성, 니트)'),
  s('id-man-black', '흰 배경 증명사진 예시(남성, 검정 니트)'),
  s('id-woman-shirt', '흰 배경 증명사진 예시(여성, 셔츠)'),
  s('id-man-suit', '흰 배경 증명사진 예시(남성, 정장)'),
];

export const OTHER_SAMPLES: Sample[] = [
  s('portrait-woman-river', '강변 인물 사진 예시'),
  s('portrait-man-park', '공원 인물 사진 예시'),
  s('portrait-woman-room', '실내 인물 사진 예시'),
  s('portrait-man-books', '서재 인물 사진 예시'),
  s('scene-sunset-tower', '노을 도시 풍경 예시'),
  s('scene-beach', '해변 풍경 예시'),
  s('scene-cherry-blossom', '벚꽃길 풍경 예시'),
  s('scene-night-city', '야경 풍경 예시'),
  s('object-dog', '강아지 사진 예시'),
  s('object-latte', '라테 사진 예시'),
  s('object-plant', '화분 사진 예시'),
  s('object-notebook', '노트와 휴대폰 사진 예시'),
];

export const HERO_SAMPLE = ID_SAMPLES[0];

/** 내 프리셋 카드 썸네일 */
export function thumbFor(key: string): string {
  if (key.includes('passport')) return ID_SAMPLES[0].file;
  if (key.includes('license')) return ID_SAMPLES[3].file;
  if (key.includes('id-print')) return ID_SAMPLES[2].file;
  if (key.includes('half')) return ID_SAMPLES[1].file;
  if (key.includes('namecard')) return OTHER_SAMPLES[2].file;
  return ID_SAMPLES[2].file;
}

export async function loadSampleBlob(sample: Sample): Promise<Blob> {
  const res = await fetch(sample.file);
  if (!res.ok) throw new Error('예시 사진을 불러오지 못했어요');
  return res.blob();
}
