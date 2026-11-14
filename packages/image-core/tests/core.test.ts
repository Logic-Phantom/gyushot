import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyMatrix,
  cmToPx,
  formatBytes,
  hasJpegExif,
  INITIAL_EDIT,
  isUpscaled,
  mmToPx,
  panBy,
  parseCustomPresetStore,
  planCrop,
  planToMatrix,
  ratioLabel,
  readDensity,
  readDimensions,
  readExifOrientation,
  resolveSpec,
  searchQuality,
  serializeCustomPresetStore,
  sniffFormat,
  validateCatalog,
  validateOutput,
  writeJpegDensity,
  writePngDensity,
  zoomTo,
  type CustomPreset,
  type InspectedImage,
  type ResolvedSpec,
} from '../src/index.ts';

const fx = (name: string) => new Uint8Array(readFileSync(join(import.meta.dirname, 'fixtures', name)));

describe('단위 환산', () => {
  it('3.5×4.5cm @300dpi → 413×531px', () => {
    expect([cmToPx(3.5, 300), cmToPx(4.5, 300)]).toEqual([413, 531]);
    expect([mmToPx(35, 300), mmToPx(45, 300)]).toEqual([413, 531]);
  });
  it('3×4cm @300dpi → 354×472px', () => {
    expect([cmToPx(3, 300), cmToPx(4, 300)]).toEqual([354, 472]);
  });
  it('5×7cm @300dpi → 591×827px', () => {
    expect([mmToPx(50, 300), mmToPx(70, 300)]).toEqual([591, 827]);
  });
  it.each([
    [72, 99, 128],
    [150, 207, 266],
    [300, 413, 531],
    [600, 827, 1063],
  ])('35×45mm @%idpi', (dpi, w, h) => {
    expect([mmToPx(35, dpi), mmToPx(45, dpi)]).toEqual([w, h]);
  });
  it('비율 표기', () => {
    expect(ratioLabel(35, 45)).toBe('7:9');
    expect(ratioLabel(30, 40)).toBe('3:4');
    expect(ratioLabel(3.5, 4.5)).toBe('7:9');
  });
  it('바이트 표기는 1KB=1000B', () => {
    expect(formatBytes(500_000)).toBe('500 KB');
    expect(formatBytes(398_400)).toBe('398 KB');
    expect(formatBytes(2_500_000)).toBe('2.5 MB');
  });
});

describe('resolveSpec', () => {
  const base = { acceptedFormats: ['image/jpeg' as const], cropMode: 'cover' as const, allowDimensionAdjustment: false };
  it('공식 픽셀이 있으면 cm/DPI 환산보다 우선', () => {
    const s = resolveSpec({ dimensions: { widthPx: 413, heightPx: 531, widthMm: 35, heightMm: 45, dpi: 600 }, constraints: base });
    expect([s.widthPx, s.heightPx]).toEqual([413, 531]);
  });
  it('인화 크기만 있으면 DPI로 환산(기본 300)', () => {
    const s = resolveSpec({ dimensions: { widthMm: 30, heightMm: 40 }, constraints: base });
    expect([s.widthPx, s.heightPx, s.dpi]).toEqual([354, 472, 300]);
    const s2 = resolveSpec({ dimensions: { widthMm: 30, heightMm: 40 }, constraints: base }, 600);
    expect([s2.widthPx, s2.heightPx]).toEqual([709, 945]);
  });
  it('픽셀도 인화 크기도 없으면 오류', () => {
    expect(() => resolveSpec({ dimensions: {}, constraints: base })).toThrow();
  });
});

describe('크롭 계산', () => {
  const out = { width: 413, height: 531 };
  it.each([
    ['가로 사진', { width: 4000, height: 3000 }],
    ['세로 사진', { width: 3000, height: 4000 }],
    ['정사각형', { width: 2000, height: 2000 }],
  ])('cover: %s — 목표 비율 유지, 이미지 안쪽', (_n, img) => {
    const p = planCrop(img, out, 'cover', INITIAL_EDIT);
    expect(p.sw / p.sh).toBeCloseTo(413 / 531, 6);
    expect(p.sx).toBeGreaterThanOrEqual(-1e-9);
    expect(p.sy).toBeGreaterThanOrEqual(-1e-9);
    expect(p.sx + p.sw).toBeLessThanOrEqual(img.width + 1e-9);
    expect(p.sy + p.sh).toBeLessThanOrEqual(img.height + 1e-9);
    expect([p.dw, p.dh]).toEqual([413, 531]);
    // 가로·세로 배율이 같다 = 왜곡 없음
    expect(p.dw / p.sw).toBeCloseTo(p.dh / p.sh, 9);
  });
  it('contain: 전체 유지 + 여백, 왜곡 없음', () => {
    const img = { width: 4000, height: 3000 };
    const p = planCrop(img, out, 'contain', INITIAL_EDIT);
    expect([p.sw, p.sh]).toEqual([4000, 3000]);
    expect(p.dw).toBeCloseTo(413);
    expect(p.dh).toBeCloseTo(413 * 0.75);
    expect(p.hasPadding).toBe(true);
    expect(p.dw / p.sw).toBeCloseTo(p.dh / p.sh, 9);
  });
  it('중심을 끝까지 옮겨도 영역이 이미지 밖으로 나가지 않음', () => {
    const img = { width: 4000, height: 3000 };
    const p = planCrop(img, out, 'cover', { ...INITIAL_EDIT, zoom: 2, centerX: 0, centerY: 1 });
    expect(p.sx).toBeCloseTo(0);
    expect(p.sy + p.sh).toBeCloseTo(3000);
  });
  it('작은 원본을 확대하면 경고 대상', () => {
    expect(isUpscaled(planCrop({ width: 300, height: 400 }, out, 'cover', INITIAL_EDIT))).toBe(true);
    expect(isUpscaled(planCrop({ width: 3000, height: 4000 }, out, 'cover', INITIAL_EDIT))).toBe(false);
  });
  it.each([0, 90, 180, 270] as const)('회전 %i° 행렬이 크롭 영역 모서리를 출력 모서리로 보냄', (rotation) => {
    const img = { width: 400, height: 300 };
    const o = { width: 100, height: 100 };
    const edit = { ...INITIAL_EDIT, rotation };
    const p = planCrop(img, o, 'cover', edit);
    const m = planToMatrix(img, rotation, p);
    // 원본 네 모서리를 변환했을 때 출력 범위를 모두 덮어야 한다(빈 곳 없음)
    const pts = [[0, 0], [400, 0], [0, 300], [400, 300]].map(([x, y]) => applyMatrix(m, x, y));
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    expect(Math.min(...xs)).toBeLessThanOrEqual(1e-6);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(100 - 1e-6);
    expect(Math.min(...ys)).toBeLessThanOrEqual(1e-6);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(100 - 1e-6);
  });
  it('드래그·확대는 범위 안으로 보정', () => {
    const img = { width: 4000, height: 3000 };
    const e1 = panBy(img, out, INITIAL_EDIT, 99999, 0, 200);
    const p = planCrop(img, out, 'cover', e1);
    expect(p.sx).toBeCloseTo(0);
    const z = zoomTo(img, out, e1, 100);
    expect(z.zoom).toBe(4);
  });
});

describe('형식·메타데이터', () => {
  it('형식 판별과 헤더 크기', () => {
    expect(sniffFormat(fx('plain.jpg'))).toBe('jpeg');
    expect(sniffFormat(fx('transparent.png'))).toBe('png');
    expect(sniffFormat(fx('lossy.webp'))).toBe('webp');
    expect(sniffFormat(fx('not-an-image.jpg'))).toBe('unknown');
    expect(readDimensions(fx('plain.jpg'))).toEqual({ width: 11, height: 13 });
    expect(readDimensions(fx('transparent.png'))).toEqual({ width: 5, height: 3 });
    expect(readDimensions(fx('lossy.webp'))).toEqual({ width: 7, height: 9 });
    expect(readDimensions(fx('lossless.webp'))).toEqual({ width: 7, height: 9 });
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('EXIF Orientation %i 읽기', (o) => {
    const b = fx(`orient-${o}.jpg`);
    expect(readExifOrientation(b)).toBe(o);
    expect(hasJpegExif(b)).toBe(true);
  });
  it('EXIF 없는 JPEG', () => {
    expect(readExifOrientation(fx('plain.jpg'))).toBe(1);
    expect(hasJpegExif(fx('plain.jpg'))).toBe(false);
  });
  it('JPEG DPI 기록 후 다시 읽기', () => {
    const b = fx('plain.jpg');
    const w = writeJpegDensity(b, 300);
    expect(readDensity(w)).toEqual({ x: 300, y: 300 });
    expect(readDimensions(w)).toEqual({ width: 11, height: 13 });
    expect(readDensity(fx('density-300.jpg'))).toEqual({ x: 300, y: 300 });
  });
  it('JFIF가 없는 JPEG에는 APP0를 새로 넣음', () => {
    const b = fx('orient-6.jpg');
    // PIL은 EXIF가 있으면 JFIF를 생략할 수 있다 → 어느 경우든 결과는 300dpi
    const w = writeJpegDensity(b, 300);
    expect(readDensity(w)).toEqual({ x: 300, y: 300 });
    expect(readExifOrientation(w)).toBe(6);
  });
  it('PNG pHYs 기록 후 다시 읽기(기존 값 교체)', () => {
    const w = writePngDensity(fx('transparent.png'), 300);
    expect(readDensity(w)).toEqual({ x: 300, y: 300 });
    const w2 = writePngDensity(w, 600);
    expect(readDensity(w2)).toEqual({ x: 600, y: 600 });
    expect(w2.length).toBe(w.length);
    expect(readDimensions(w2)).toEqual({ width: 5, height: 3 });
  });
});

describe('용량 탐색', () => {
  // 품질 q에서 크기 = 1,000,000 × q (단조 증가 모형)
  const enc = async (q: number) => ({ bytes: Math.round(1_000_000 * q), value: q });
  it('시작 품질로 상한 이하면 그대로', async () => {
    const r = await searchQuality(enc, { startQuality: 0.4, minQuality: 0.3, maxBytes: 500_000, maxAttempts: 8 });
    expect(r.ok && r.best.quality).toBe(0.4);
  });
  it('상한 이하 최대 품질을 찾음(경계 포함)', async () => {
    const r = await searchQuality(enc, { startQuality: 0.9, minQuality: 0.4, maxBytes: 500_000, maxAttempts: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.best.bytes).toBeLessThanOrEqual(500_000);
      expect(r.best.quality).toBeGreaterThan(0.45);
      expect(r.attempts.length).toBeLessThanOrEqual(10);
    }
  });
  it('최저 품질로도 넘으면 실패(픽셀을 줄이지 않음)', async () => {
    const r = await searchQuality(enc, { startQuality: 0.9, minQuality: 0.4, maxBytes: 300_000, maxAttempts: 8 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too-large');
  });
  it('상한이 없으면 한 번만 인코딩', async () => {
    const r = await searchQuality(enc, { startQuality: 0.8, minQuality: 0.4, maxAttempts: 8 });
    expect(r.ok && r.attempts.length).toBe(1);
  });
});

describe('출력 검사', () => {
  const spec: ResolvedSpec = {
    widthPx: 413, heightPx: 531, aspect: 413 / 531,
    minWidthPx: 395, maxWidthPx: 431, minHeightPx: 507, maxHeightPx: 550,
    maxBytes: 500_000, acceptedFormats: ['image/jpeg'], preferredFormat: 'image/jpeg', cropMode: 'cover',
  };
  const out = (o: Partial<InspectedImage>): InspectedImage => ({
    width: 413, height: 531, bytes: 400_000, format: 'jpeg', declaredMime: 'image/jpeg', hasExif: false, dpi: { x: 300, y: 300 }, ...o,
  });
  const opt = { requestedFormat: 'image/jpeg' as const, requestedDpi: 300, hasContentRules: false };
  it('500KB 경계: 500,000 bytes는 통과, 500,001은 실패', () => {
    expect(validateOutput(out({ bytes: 500_000 }), spec, opt).status).toBe('pass');
    expect(validateOutput(out({ bytes: 500_001 }), spec, opt).status).toBe('fail');
  });
  it('허용 범위 밖 픽셀은 실패', () => {
    expect(validateOutput(out({ width: 394 }), spec, opt).status).toBe('fail');
    expect(validateOutput(out({ height: 551 }), spec, opt).status).toBe('fail');
    expect(validateOutput(out({ width: 431, height: 507 }), spec, opt).status).toBe('pass');
  });
  it('형식이 다르면 실패, DPI 미기록은 경고', () => {
    expect(validateOutput(out({ format: 'png' }), spec, opt).status).toBe('fail');
    expect(validateOutput(out({ dpi: undefined }), spec, opt).status).toBe('warning');
  });
  it('EXIF가 남아 있으면 실패', () => {
    expect(validateOutput(out({ hasExif: true }), spec, opt).status).toBe('fail');
  });
  it('사진 내용 규정이 있으면 경고로 남김(자동 통과 금지)', () => {
    const r = validateOutput(out({}), spec, { ...opt, hasContentRules: true });
    expect(r.status).toBe('warning');
    expect(r.items.find((i) => i.id === 'content')?.status).toBe('warning');
  });
  it('최대 용량이 없는 프리셋은 용량 항목 없음', () => {
    const r = validateOutput(out({ bytes: 9_999_999 }), { ...spec, maxBytes: undefined }, opt);
    expect(r.items.some((i) => i.id === 'bytes')).toBe(false);
    expect(r.status).toBe('pass');
  });
});

describe('프리셋 데이터', () => {
  const ok = {
    id: 'passport-online-kr', name: '여권', shortDescription: '', category: 'passport', kind: 'official-online', enabled: true,
    dimensions: { widthPx: 413, heightPx: 531 },
    constraints: { acceptedFormats: ['image/jpeg'], cropMode: 'cover', allowDimensionAdjustment: false, maxBytes: 500000 },
    guidance: { userNotice: [], nonAutomatedChecks: [] },
    source: { organization: '외교부', url: 'https://www.passport.go.kr', checkedAt: '2026-11-14', evidence: ['500KB 이하'] },
    status: 'verified', version: 1,
  };
  it('정상 카탈로그 통과', () => {
    expect(validateCatalog({ presets: [ok] })).toEqual([]);
  });
  it.each([
    ['공식 출처 누락', { ...ok, source: undefined }],
    ['음수 픽셀', { ...ok, dimensions: { widthPx: -1, heightPx: 531 } }],
    ['잘못된 형식', { ...ok, constraints: { ...ok.constraints, acceptedFormats: ['image/gif'] } }],
    ['일반 규격을 verified로', { ...ok, kind: 'common-print', source: undefined }],
    ['검증 대기인데 활성', { ...ok, status: 'needs-review' }],
    ['id 중복', null],
  ])('잘못된 데이터 거부: %s', (_n, bad) => {
    const presets = bad ? [bad] : [ok, ok];
    expect(validateCatalog({ presets }).length).toBeGreaterThan(0);
  });
});

describe('사용자 프리셋 저장', () => {
  const p: CustomPreset = {
    id: 'c1', name: '취업 지원 사진', createdAt: '2026-11-14T00:00:00Z', updatedAt: '2026-11-14T00:00:00Z',
    dimensions: { widthPx: 450, heightPx: 600 },
    constraints: { acceptedFormats: ['image/jpeg'], cropMode: 'cover', allowDimensionAdjustment: false, maxBytes: 300000 },
  };
  it('저장 → 복구 왕복', () => {
    const r = parseCustomPresetStore(serializeCustomPresetStore([p]));
    expect(r).toEqual({ presets: [p], recovered: false, dropped: 0 });
  });
  it('손상 JSON은 빈 목록으로 복구', () => {
    expect(parseCustomPresetStore('{not json')).toEqual({ presets: [], recovered: true, dropped: 0 });
  });
  it('v0(배열) → v1 이전, 깨진 항목만 버림', () => {
    const r = parseCustomPresetStore(JSON.stringify([p, { id: 'x', name: '', dimensions: {}, constraints: {} }]));
    expect(r.presets).toEqual([p]);
    expect(r.dropped).toBe(1);
    expect(r.recovered).toBe(true);
  });
  it('저장값 없음', () => {
    expect(parseCustomPresetStore(null)).toEqual({ presets: [], recovered: false, dropped: 0 });
  });
});
