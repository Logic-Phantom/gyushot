// 파일 바이트를 직접 읽는 순수 함수: 형식 판별, 헤더 픽셀 크기, EXIF 방향, DPI(JFIF density / PNG pHYs) 읽기·쓰기.
// 캔버스 재인코딩 결과에는 EXIF가 없다. 개인정보 메타데이터 제거와 DPI 기록은 별개의 처리다(4-4).
import type { DetectedFormat } from './types.ts';

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

export function sniffFormat(b: Uint8Array): DetectedFormat {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (b.length >= 6 && ascii(b, 0, 4) === 'GIF8') return 'gif';
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return 'bmp';
  if (b.length >= 12 && ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return 'heic';
    if (/^(avif|avis)$/.test(brand)) return 'avif';
  }
  return 'unknown';
}

export function mimeOfFormat(f: DetectedFormat): string {
  switch (f) {
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'heic': return 'image/heic';
    case 'avif': return 'image/avif';
    case 'bmp': return 'image/bmp';
    default: return 'application/octet-stream';
  }
}

interface JpegSegment {
  marker: number;
  /** 마커(0xFF xx) 시작 위치 */
  offset: number;
  /** 길이 필드 포함 세그먼트 데이터 길이 */
  length: number;
}

/** SOS 전까지의 JPEG 세그먼트 목록 */
export function jpegSegments(b: Uint8Array): JpegSegment[] {
  const out: JpegSegment[] = [];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    const length = u16be(b, i + 2);
    out.push({ marker, offset: i, length });
    if (marker === 0xda) break;
    i += 2 + length;
  }
  return out;
}

/** 헤더에서 픽셀 크기를 읽는다(디코딩 없이). */
export function readDimensions(b: Uint8Array): { width: number; height: number } | null {
  const f = sniffFormat(b);
  if (f === 'png' && b.length >= 24) return { width: u32be(b, 16), height: u32be(b, 20) };
  if (f === 'jpeg') {
    for (const s of jpegSegments(b)) {
      const m = s.marker;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { height: u16be(b, s.offset + 5), width: u16be(b, s.offset + 7) };
      }
    }
    return null;
  }
  if (f === 'webp' && b.length >= 30) {
    const chunk = ascii(b, 12, 4);
    if (chunk === 'VP8 ') return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  return null;
}

export function hasJpegExif(b: Uint8Array): boolean {
  if (sniffFormat(b) !== 'jpeg') return false;
  return jpegSegments(b).some((s) => s.marker === 0xe1 && ascii(b, s.offset + 4, 4) === 'Exif');
}

/** EXIF Orientation(1~8). 없거나 읽을 수 없으면 1. */
export function readExifOrientation(b: Uint8Array): number {
  if (sniffFormat(b) !== 'jpeg') return 1;
  const seg = jpegSegments(b).find((s) => s.marker === 0xe1 && ascii(b, s.offset + 4, 4) === 'Exif');
  if (!seg) return 1;
  const tiff = seg.offset + 10;
  if (tiff + 8 > b.length) return 1;
  const le = ascii(b, tiff, 2) === 'II';
  const r16 = (i: number) => (le ? u16le(b, i) : u16be(b, i));
  const r32 = (i: number) => (le ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0 : u32be(b, i));
  const ifd = tiff + r32(tiff + 4);
  if (ifd + 2 > b.length) return 1;
  const count = r16(ifd);
  for (let k = 0; k < count; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > b.length) break;
    if (r16(e) === 0x0112) {
      const v = r16(e + 8);
      return v >= 1 && v <= 8 ? v : 1;
    }
  }
  return 1;
}

// ── DPI ─────────────────────────────────────────────────

/** JFIF APP0 density. units: 1=dpi, 2=dpcm, 0=비율만 */
export function readJpegDensity(b: Uint8Array): { x: number; y: number } | undefined {
  const s = jpegSegments(b).find((x) => x.marker === 0xe0 && ascii(b, x.offset + 4, 5) === 'JFIF\0');
  if (!s) return undefined;
  const p = s.offset + 4 + 7; // 'JFIF\0' + version(2)
  const units = b[p];
  const x = u16be(b, p + 1);
  const y = u16be(b, p + 3);
  if (units === 1) return { x, y };
  if (units === 2) return { x: Math.round(x * 2.54), y: Math.round(y * 2.54) };
  return undefined;
}

/** JFIF APP0의 density를 dpi로 고친다. APP0가 없으면 SOI 뒤에 새로 넣는다. 새 배열을 돌려준다. */
export function writeJpegDensity(b: Uint8Array, dpi: number): Uint8Array {
  if (sniffFormat(b) !== 'jpeg') throw new Error('JPEG가 아니에요');
  const d = Math.round(dpi);
  const s = jpegSegments(b).find((x) => x.marker === 0xe0 && ascii(b, x.offset + 4, 5) === 'JFIF\0');
  if (s) {
    const out = b.slice();
    const p = s.offset + 4 + 7;
    out[p] = 1;
    out[p + 1] = d >> 8; out[p + 2] = d & 0xff;
    out[p + 3] = d >> 8; out[p + 4] = d & 0xff;
    return out;
  }
  const app0 = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    d >> 8, d & 0xff, d >> 8, d & 0xff, 0x00, 0x00,
  ]);
  const out = new Uint8Array(b.length + app0.length);
  out.set(b.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(b.subarray(2), 2 + app0.length);
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface PngChunk { type: string; offset: number; length: number }

export function pngChunks(b: Uint8Array): PngChunk[] {
  const out: PngChunk[] = [];
  let i = 8;
  while (i + 12 <= b.length) {
    const length = u32be(b, i);
    const type = ascii(b, i + 4, 4);
    out.push({ type, offset: i, length });
    if (type === 'IEND') break;
    i += 12 + length;
  }
  return out;
}

export function readPngDensity(b: Uint8Array): { x: number; y: number } | undefined {
  const c = pngChunks(b).find((x) => x.type === 'pHYs');
  if (!c) return undefined;
  const p = c.offset + 8;
  if (b[p + 8] !== 1) return undefined; // 단위가 미터가 아니면 비율만
  return { x: Math.round(u32be(b, p) * 0.0254), y: Math.round(u32be(b, p + 4) * 0.0254) };
}

/** pHYs(픽셀/미터)를 dpi로 기록한다. 기존 pHYs는 교체, 없으면 IHDR 뒤에 넣는다. */
export function writePngDensity(b: Uint8Array, dpi: number): Uint8Array {
  if (sniffFormat(b) !== 'png') throw new Error('PNG가 아니에요');
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const chunks = pngChunks(b);
  const existing = chunks.find((c) => c.type === 'pHYs');
  const ihdr = chunks.find((c) => c.type === 'IHDR');
  if (!ihdr) throw new Error('IHDR가 없어요');
  const cutStart = existing ? existing.offset : ihdr.offset + 12 + ihdr.length;
  const cutEnd = existing ? existing.offset + 12 + existing.length : cutStart;
  const out = new Uint8Array(b.length - (cutEnd - cutStart) + chunk.length);
  out.set(b.subarray(0, cutStart), 0);
  out.set(chunk, cutStart);
  out.set(b.subarray(cutEnd), cutStart + chunk.length);
  return out;
}

/** 형식별 DPI 읽기. WebP는 표준 DPI 필드가 없어 undefined(D-008). */
export function readDensity(b: Uint8Array): { x: number; y: number } | undefined {
  const f = sniffFormat(b);
  if (f === 'jpeg') return readJpegDensity(b);
  if (f === 'png') return readPngDensity(b);
  return undefined;
}
