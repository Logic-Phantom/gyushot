// 출력 파일 검사: 변환 입력값이 아니라 다시 읽은 실제 파일 값(InspectedImage)으로 판정한다.
import { formatBytes, formatLabel } from './units.ts';
import type { CheckItem, CheckStatus, InspectedImage, OutputFormat, ResolvedSpec, ValidationReport } from './types.ts';

const FORMAT_OF: Record<OutputFormat, InspectedImage['format']> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ValidateOptions {
  /** 사용자가 고른 출력 형식 */
  requestedFormat: OutputFormat;
  /** DPI 기록을 요청했는지 */
  requestedDpi?: number;
  /** 사진 내용(얼굴·배경·촬영일 등)을 따로 확인해야 하는 프리셋인지 */
  hasContentRules: boolean;
}

function rangeText(min?: number, max?: number, exact?: number): string {
  if (min != null && max != null) return `${min}~${max}px`;
  return `${exact}px`;
}

export function validateOutput(out: InspectedImage, spec: ResolvedSpec, opt: ValidateOptions): ValidationReport {
  const items: CheckItem[] = [];

  const wMin = spec.minWidthPx ?? spec.widthPx;
  const wMax = spec.maxWidthPx ?? spec.widthPx;
  const hMin = spec.minHeightPx ?? spec.heightPx;
  const hMax = spec.maxHeightPx ?? spec.heightPx;
  items.push({
    id: 'width',
    label: '가로 픽셀',
    status: out.width >= wMin && out.width <= wMax ? 'pass' : 'fail',
    expected: rangeText(spec.minWidthPx, spec.maxWidthPx, spec.widthPx),
    actual: `${out.width}px`,
  });
  items.push({
    id: 'height',
    label: '세로 픽셀',
    status: out.height >= hMin && out.height <= hMax ? 'pass' : 'fail',
    expected: rangeText(spec.minHeightPx, spec.maxHeightPx, spec.heightPx),
    actual: `${out.height}px`,
  });

  const formatOk = out.format === FORMAT_OF[opt.requestedFormat] && spec.acceptedFormats.includes(opt.requestedFormat);
  items.push({
    id: 'format',
    label: '파일 형식',
    status: out.format === 'unknown' ? 'unsupported' : formatOk ? 'pass' : 'fail',
    expected: spec.acceptedFormats.map(formatLabel).join(' / '),
    actual: out.format === 'unknown' ? '알 수 없음' : out.format.toUpperCase().replace('JPEG', 'JPG'),
  });

  if (spec.maxBytes != null) {
    items.push({
      id: 'bytes',
      label: '파일 용량',
      status: out.bytes <= spec.maxBytes ? 'pass' : 'fail',
      expected: `${formatBytes(spec.maxBytes)} 이하 (${spec.maxBytes.toLocaleString('ko-KR')} bytes)`,
      actual: `${formatBytes(out.bytes)} (${out.bytes.toLocaleString('ko-KR')} bytes)`,
    });
  }

  if (opt.requestedDpi != null) {
    const ok = out.dpi != null && out.dpi.x === opt.requestedDpi && out.dpi.y === opt.requestedDpi;
    items.push({
      id: 'dpi',
      label: '해상도 정보(DPI)',
      // DPI는 권장값이라 기록하지 못해도 실패가 아니라 경고로 둔다
      status: ok ? 'pass' : 'warning',
      expected: `${opt.requestedDpi}dpi`,
      actual: out.dpi ? `${out.dpi.x}dpi` : '기록 없음',
    });
  }

  items.push({
    id: 'metadata',
    label: '촬영 정보(EXIF) 제거',
    status: out.hasExif ? 'fail' : 'pass',
    expected: '없음',
    actual: out.hasExif ? '남아 있음' : '없음',
  });

  if (opt.hasContentRules) {
    items.push({
      id: 'content',
      label: '사진 내용(얼굴·배경·촬영일)',
      status: 'warning',
      expected: '제출처 기준',
      actual: '직접 확인 필요',
    });
  }

  return { status: summarize(items.map((i) => i.status)), items };
}

/** 하나라도 fail이면 fail, unsupported가 있으면 unsupported, warning이 있으면 warning */
export function summarize(statuses: CheckStatus[]): CheckStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('unsupported')) return 'unsupported';
  if (statuses.includes('warning')) return 'warning';
  return 'pass';
}
