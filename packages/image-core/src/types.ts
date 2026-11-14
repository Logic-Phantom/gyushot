// 규격·프리셋·검사 결과 타입. 화면(React)과 앱인토스 SDK에 의존하지 않는다.

export type PresetKind = 'official-online' | 'official-print' | 'common-print' | 'custom';
export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export type CropMode = 'cover' | 'contain';
export type PresetCategory = 'passport' | 'id' | 'license' | 'employment' | 'print' | 'custom';
export type PresetStatus = 'verified' | 'needs-review' | 'general';

export interface PresetDimensions {
  widthPx?: number;
  heightPx?: number;
  widthMm?: number;
  heightMm?: number;
  /** 인화 규격의 기본 DPI. 픽셀이 명시되지 않은 프리셋에서 픽셀 환산에 쓴다. */
  dpi?: number;
}

export interface PresetConstraints {
  minWidthPx?: number;
  maxWidthPx?: number;
  minHeightPx?: number;
  maxHeightPx?: number;
  /** 바이트 단위 상한(이하). UI에서 KB/MB로 표시한다. */
  maxBytes?: number;
  acceptedFormats: OutputFormat[];
  preferredFormat?: OutputFormat;
  cropMode: CropMode;
  /** 허용 범위 안에서 픽셀을 바꿔도 되는지. false면 정해진 픽셀만 출력한다. */
  allowDimensionAdjustment: boolean;
}

export interface PresetSource {
  organization: string;
  url: string;
  /** YYYY-MM-DD */
  checkedAt: string;
  effectiveDate?: string;
  evidence: string[];
}

export interface ImagePreset {
  id: string;
  name: string;
  shortDescription: string;
  category: PresetCategory;
  kind: PresetKind;
  enabled: boolean;
  /** 아이콘 키(화면 쪽 아이콘 세트 이름). 코어는 값만 보관한다. */
  icon?: string;
  dimensions: PresetDimensions;
  constraints: PresetConstraints;
  guidance: {
    userNotice: string[];
    nonAutomatedChecks: string[];
  };
  source?: PresetSource;
  status: PresetStatus;
  version: number;
}

export interface CustomPreset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  basedOnPresetId?: string;
  dimensions: PresetDimensions;
  constraints: PresetConstraints;
}

/** 프리셋을 실제 출력 값으로 풀어낸 결과. 화면과 파이프라인은 이 값만 본다. */
export interface ResolvedSpec {
  widthPx: number;
  heightPx: number;
  /** 가로/세로 */
  aspect: number;
  dpi?: number;
  /** 인화 크기(mm). 인화 규격일 때만 */
  printMm?: { width: number; height: number };
  minWidthPx?: number;
  maxWidthPx?: number;
  minHeightPx?: number;
  maxHeightPx?: number;
  maxBytes?: number;
  acceptedFormats: OutputFormat[];
  preferredFormat: OutputFormat;
  cropMode: CropMode;
}

export type DetectedFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'avif' | 'bmp' | 'unknown';

/** 출력 파일을 다시 읽어 얻은 실제 값 */
export interface InspectedImage {
  width: number;
  height: number;
  bytes: number;
  format: DetectedFormat;
  /** Blob.type(브라우저가 붙인 MIME) */
  declaredMime: string;
  /** 파일 안에서 실제로 읽은 DPI. 읽지 못했으면 undefined */
  dpi?: { x: number; y: number };
  /** EXIF APP1 존재 여부(JPEG) */
  hasExif: boolean;
}

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'unsupported';

export interface CheckItem {
  id: 'width' | 'height' | 'bytes' | 'format' | 'dpi' | 'metadata' | 'content';
  label: string;
  status: CheckStatus;
  expected: string;
  actual: string;
}

export interface ValidationReport {
  status: CheckStatus;
  items: CheckItem[];
}
