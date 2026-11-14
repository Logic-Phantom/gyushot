// 단위 환산과 출력 픽셀 계산(순수 함수).
import type { ImagePreset, OutputFormat, ResolvedSpec } from './types.ts';

export const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export function cmToPx(cm: number, dpi: number): number {
  return Math.round((cm / 2.54) * dpi);
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

/** 최대공약수로 줄인 비율 표기. 3.5×4.5cm → "7:9", 413×531 → "7:9"(근사) 대신 정확한 정수비만 줄인다. */
export function ratioLabel(width: number, height: number): string {
  // 소수(mm)는 10배 해서 정수로 만든다
  const scale = Number.isInteger(width) && Number.isInteger(height) ? 1 : 10;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

export const DEFAULT_PRINT_DPI = 300;

/**
 * 프리셋을 출력 값으로 푼다.
 * - 픽셀이 명시돼 있으면 픽셀이 우선(공식 온라인 규격).
 * - 인화 크기(mm)만 있으면 dpi(인자 → 프리셋 → 300)로 환산한다.
 * - 픽셀 범위가 없으면 정확한 픽셀 하나만 허용한다.
 */
export function resolveSpec(preset: Pick<ImagePreset, 'dimensions' | 'constraints'>, dpiOverride?: number): ResolvedSpec {
  const { dimensions: d, constraints: c } = preset;
  const dpi = dpiOverride ?? d.dpi ?? (d.widthMm != null ? DEFAULT_PRINT_DPI : undefined);
  let widthPx = d.widthPx;
  let heightPx = d.heightPx;
  if ((widthPx == null || heightPx == null) && d.widthMm != null && d.heightMm != null && dpi != null) {
    widthPx = mmToPx(d.widthMm, dpi);
    heightPx = mmToPx(d.heightMm, dpi);
  }
  if (widthPx == null || heightPx == null || widthPx <= 0 || heightPx <= 0) {
    throw new Error('출력 픽셀을 정할 수 없는 프리셋이에요(픽셀 또는 인화 크기+DPI 필요).');
  }
  const preferred: OutputFormat = c.preferredFormat ?? c.acceptedFormats[0] ?? 'image/jpeg';
  return {
    widthPx,
    heightPx,
    aspect: widthPx / heightPx,
    dpi,
    printMm: d.widthMm != null && d.heightMm != null ? { width: d.widthMm, height: d.heightMm } : undefined,
    minWidthPx: c.minWidthPx,
    maxWidthPx: c.maxWidthPx,
    minHeightPx: c.minHeightPx,
    maxHeightPx: c.maxHeightPx,
    maxBytes: c.maxBytes,
    acceptedFormats: c.acceptedFormats,
    preferredFormat: preferred,
    cropMode: c.cropMode,
  };
}

/** 사람이 읽는 크기 표기: 35×45mm → "3.5 × 4.5cm" */
export function formatPrintSize(widthMm: number, heightMm: number): string {
  const fmt = (mm: number) => (mm % 10 === 0 ? String(mm / 10) : (mm / 10).toFixed(1));
  return `${fmt(widthMm)} × ${fmt(heightMm)}cm`;
}

/**
 * 바이트 표시. 1KB = 1,000 bytes(SI)로 표시한다(D-006: 제출처 상한 해석을 보수적으로 맞춤).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;
}

export function kbToBytes(kb: number): number {
  return Math.round(kb * 1000);
}

export function formatLabel(format: OutputFormat): string {
  return format === 'image/jpeg' ? 'JPG' : format === 'image/png' ? 'PNG' : 'WebP';
}

export function extensionOf(format: OutputFormat): string {
  return format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
}
