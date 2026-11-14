// 브라우저 이미지 어댑터: 디코딩(createImageBitmap) → 캔버스 렌더 → 인코딩 → 출력 재검사.
// 순수 계산은 상위 모듈을 쓰고, 이 파일만 DOM/Canvas에 의존한다.
import { DEFAULT_MAX_ATTEMPTS, DEFAULT_MIN_QUALITY, searchQuality } from '../compress.ts';
import { planCrop, planToMatrix, type EditState, type Size } from '../crop.ts';
import { hasJpegExif, readDensity, readDimensions, readExifOrientation, sniffFormat, writeJpegDensity, writePngDensity } from '../metadata.ts';
import type { InspectedImage, OutputFormat, ResolvedSpec, ValidationReport } from '../types.ts';
import { validateOutput } from '../validate.ts';

/** 입력 상한(D-009). 기기 테스트 후 조정한다. */
export const MAX_INPUT_BYTES = 20 * 1000 * 1000;
export const MAX_INPUT_PIXELS = 40_000_000;
const MAX_CANVAS_SIDE = 8192;

export type DecodeError = 'too-large-file' | 'too-many-pixels' | 'heic-unsupported' | 'unsupported-format' | 'decode-failed';

export interface DecodedSource {
  bitmap: ImageBitmap;
  /** EXIF 방향을 반영한(=화면에 보이는) 크기 */
  size: Size;
  bytes: number;
  format: ReturnType<typeof sniffFormat>;
  declaredMime: string;
  exifOrientation: number;
}

export async function readHead(blob: Blob, n = 256 * 1024): Promise<Uint8Array> {
  return new Uint8Array(await blob.slice(0, n).arrayBuffer());
}

/**
 * 원본을 디코딩한다. orientation=true면 EXIF Orientation을 브라우저가 적용(from-image), false면 무시(none).
 * 회전은 여기서 한 번만 적용하고 이후 단계는 결과 비트맵 기준으로만 돈다(중복 회전 방지).
 */
export async function decodeSource(blob: Blob, opts: { applyOrientation: boolean }): Promise<{ ok: true; source: DecodedSource } | { ok: false; error: DecodeError }> {
  if (blob.size > MAX_INPUT_BYTES) return { ok: false, error: 'too-large-file' };
  const head = await readHead(blob);
  const format = sniffFormat(head);
  const dims = readDimensions(head);
  if (dims && dims.width * dims.height > MAX_INPUT_PIXELS) return { ok: false, error: 'too-many-pixels' };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: opts.applyOrientation ? 'from-image' : 'none' });
  } catch {
    if (format === 'heic') return { ok: false, error: 'heic-unsupported' };
    if (format === 'unknown') return { ok: false, error: 'unsupported-format' };
    return { ok: false, error: 'decode-failed' };
  }
  if (bitmap.width * bitmap.height > MAX_INPUT_PIXELS) {
    bitmap.close();
    return { ok: false, error: 'too-many-pixels' };
  }
  return {
    ok: true,
    source: {
      bitmap,
      size: { width: bitmap.width, height: bitmap.height },
      bytes: blob.size,
      format,
      declaredMime: blob.type,
      exifOrientation: readExifOrientation(head),
    },
  };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 큰 축소는 절반씩 줄여 계단 현상을 줄인다. 반환 배율 f: 새 이미지 = 원본 × f */
function prescale(src: CanvasImageSource & { width: number; height: number }, targetScale: number): { image: CanvasImageSource; f: number; cleanup: () => void } {
  let f = 1;
  let image: CanvasImageSource = src;
  let w = src.width;
  let h = src.height;
  const temps: HTMLCanvasElement[] = [];
  while (targetScale / f < 0.5 && w > 2 && h > 2) {
    const nw = Math.max(1, Math.round(w / 2));
    const nh = Math.max(1, Math.round(h / 2));
    const c = makeCanvas(nw, nh);
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, nw, nh);
    temps.push(c);
    image = c;
    f *= nw / w;
    w = nw;
    h = nh;
  }
  return {
    image,
    f,
    cleanup: () => temps.forEach((c) => { c.width = 0; c.height = 0; }),
  };
}

export interface RenderOptions {
  output: Size;
  mode: ResolvedSpec['cropMode'];
  edit: EditState;
  /** contain 여백·투명 영역을 칠할 색. null이면 투명 유지(PNG/WebP 전용) */
  background: string | null;
}

export function renderToCanvas(source: DecodedSource, opts: RenderOptions): HTMLCanvasElement {
  if (opts.output.width > MAX_CANVAS_SIDE || opts.output.height > MAX_CANVAS_SIDE) throw new Error('출력 크기가 너무 커요');
  const plan = planCrop(source.size, opts.output, opts.mode, opts.edit);
  const canvas = makeCanvas(opts.output.width, opts.output.height);
  const ctx = canvas.getContext('2d')!;
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const pre = prescale(source.bitmap, plan.scale);
  const m = planToMatrix(source.size, opts.edit.rotation, plan);
  ctx.save();
  ctx.beginPath();
  ctx.rect(plan.dx, plan.dy, plan.dw, plan.dh);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // 미리 줄인 이미지 좌표 = 원본 × f → 원본 좌표 = 미리 줄인 좌표 / f
  ctx.setTransform(m[0] / pre.f, m[1] / pre.f, m[2] / pre.f, m[3] / pre.f, m[4], m[5]);
  ctx.drawImage(pre.image, 0, 0);
  ctx.restore();
  pre.cleanup();
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: OutputFormat, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('인코딩 실패'))), mime, quality);
  });
}

export type EncodeError = 'format-unsupported' | 'encode-failed';

/** 인코딩 + (요청 시) DPI 기록. 브라우저가 요청 형식이 아닌 Blob을 주면 위장하지 않고 실패한다. */
export async function encodeCanvas(canvas: HTMLCanvasElement, format: OutputFormat, quality: number, dpi?: number): Promise<Blob> {
  const raw = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : quality);
  let bytes = new Uint8Array(await raw.arrayBuffer());
  const actual = sniffFormat(bytes);
  const expected = format === 'image/jpeg' ? 'jpeg' : format === 'image/png' ? 'png' : 'webp';
  if (actual !== expected) {
    const err = new Error(`브라우저가 ${format}을(를) 만들지 못했어요`);
    (err as Error & { code: EncodeError }).code = 'format-unsupported';
    throw err;
  }
  if (dpi != null) {
    if (actual === 'jpeg') bytes = writeJpegDensity(bytes, dpi) as Uint8Array<ArrayBuffer>;
    else if (actual === 'png') bytes = writePngDensity(bytes, dpi) as Uint8Array<ArrayBuffer>;
  }
  return new Blob([bytes], { type: format });
}

const supportCache = new Map<OutputFormat, boolean>();

/** 실제로 1×1 캔버스를 인코딩해 형식 지원을 확인한다(추측 금지). */
export async function canEncode(format: OutputFormat): Promise<boolean> {
  const cached = supportCache.get(format);
  if (cached != null) return cached;
  let ok = false;
  try {
    const b = await canvasToBlob(makeCanvas(1, 1), format, 0.8);
    ok = sniffFormat(new Uint8Array(await b.arrayBuffer())) === (format === 'image/jpeg' ? 'jpeg' : format === 'image/png' ? 'png' : 'webp');
  } catch {
    ok = false;
  }
  supportCache.set(format, ok);
  return ok;
}

/** 결과 Blob을 다시 읽어 실제 값을 얻는다(디코딩으로 픽셀 확인). */
export async function inspectBlob(blob: Blob): Promise<InspectedImage> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const format = sniffFormat(bytes);
  let width = 0;
  let height = 0;
  try {
    const bmp = await createImageBitmap(blob);
    width = bmp.width;
    height = bmp.height;
    bmp.close();
  } catch {
    const d = readDimensions(bytes);
    width = d?.width ?? 0;
    height = d?.height ?? 0;
  }
  return {
    width,
    height,
    bytes: blob.size,
    format,
    declaredMime: blob.type,
    dpi: readDensity(bytes),
    hasExif: hasJpegExif(bytes),
  };
}

export type Stage = 'render' | 'compress' | 'verify';

export interface ConvertOptions extends RenderOptions {
  format: OutputFormat;
  /** 사용자가 고른 품질(0~1) — JPEG/WebP */
  quality: number;
  maxBytes?: number;
  /** 기록할 DPI(JPEG/PNG만) */
  dpi?: number;
  spec: ResolvedSpec;
  hasContentRules: boolean;
  onStage?: (stage: Stage) => void;
  timeLimitMs?: number;
}

export type ConvertResult =
  | { ok: true; blob: Blob; inspected: InspectedImage; report: ValidationReport; quality: number | null; attempts: number; elapsedMs: number }
  | { ok: false; reason: 'too-large'; smallestBytes: number; attempts: number }
  | { ok: false; reason: 'format-unsupported' | 'render-failed' };

export async function convert(source: DecodedSource, opts: ConvertOptions): Promise<ConvertResult> {
  const t0 = performance.now();
  opts.onStage?.('render');
  let canvas: HTMLCanvasElement;
  try {
    canvas = renderToCanvas(source, opts);
  } catch {
    return { ok: false, reason: 'render-failed' };
  }
  try {
    opts.onStage?.('compress');
    const lossy = opts.format !== 'image/png';
    const dpi = opts.format === 'image/webp' ? undefined : opts.dpi;
    let blob: Blob;
    let quality: number | null = null;
    let attempts = 1;
    if (lossy) {
      const r = await searchQuality(
        async (q) => {
          const b = await encodeCanvas(canvas, opts.format, q, dpi);
          return { bytes: b.size, value: b };
        },
        {
          startQuality: opts.quality,
          minQuality: Math.min(DEFAULT_MIN_QUALITY, opts.quality),
          maxBytes: opts.maxBytes,
          maxAttempts: DEFAULT_MAX_ATTEMPTS,
          timeLimitMs: opts.timeLimitMs ?? 8000,
        },
      );
      attempts = r.attempts.length;
      if (!r.ok) return { ok: false, reason: 'too-large', smallestBytes: r.smallest.bytes, attempts };
      blob = r.best.value;
      quality = r.best.quality;
    } else {
      blob = await encodeCanvas(canvas, opts.format, 1, dpi);
      if (opts.maxBytes != null && blob.size > opts.maxBytes) return { ok: false, reason: 'too-large', smallestBytes: blob.size, attempts: 1 };
    }
    opts.onStage?.('verify');
    const inspected = await inspectBlob(blob);
    const report = validateOutput(inspected, opts.spec, {
      requestedFormat: opts.format,
      requestedDpi: dpi,
      hasContentRules: opts.hasContentRules,
    });
    return { ok: true, blob, inspected, report, quality, attempts, elapsedMs: Math.round(performance.now() - t0) };
  } catch (e) {
    if ((e as { code?: string }).code === 'format-unsupported') return { ok: false, reason: 'format-unsupported' };
    return { ok: false, reason: 'render-failed' };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** 예상 용량: 지정 품질로 한 번만 인코딩해 실제 크기를 잰다(탐색 없음). */
export async function estimateBytes(source: DecodedSource, opts: RenderOptions & { format: OutputFormat; quality: number; dpi?: number }): Promise<number> {
  const canvas = renderToCanvas(source, opts);
  try {
    const b = await encodeCanvas(canvas, opts.format, opts.quality, opts.format === 'image/webp' ? undefined : opts.dpi);
    return b.size;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
