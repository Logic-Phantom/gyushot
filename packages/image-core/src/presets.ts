// 프리셋 데이터 검증과 사용자 프리셋 저장 스키마(버전·손상 복구).
import type { CustomPreset, ImagePreset, OutputFormat, PresetConstraints, PresetDimensions } from './types.ts';

const FORMATS: OutputFormat[] = ['image/jpeg', 'image/png', 'image/webp'];
const KINDS = ['official-online', 'official-print', 'common-print', 'custom'];
const CATEGORIES = ['passport', 'id', 'license', 'employment', 'print', 'custom'];
const STATUSES = ['verified', 'needs-review', 'general'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{1,47}$/;

const isPos = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isPosInt = (v: unknown) => isPos(v) && Number.isInteger(v);

export function validateDimensions(d: PresetDimensions | undefined, where: string, errors: string[]): void {
  if (!d || typeof d !== 'object') { errors.push(`${where}: dimensions 없음`); return; }
  for (const k of ['widthPx', 'heightPx', 'dpi'] as const) {
    if (d[k] != null && !isPosInt(d[k])) errors.push(`${where}: ${k}는 양의 정수여야 해요`);
  }
  for (const k of ['widthMm', 'heightMm'] as const) {
    if (d[k] != null && !isPos(d[k])) errors.push(`${where}: ${k}는 양수여야 해요`);
  }
  const hasPx = d.widthPx != null && d.heightPx != null;
  const hasMm = d.widthMm != null && d.heightMm != null;
  if (!hasPx && !hasMm) errors.push(`${where}: 픽셀(widthPx/heightPx) 또는 인화 크기(widthMm/heightMm)가 필요해요`);
  if ((d.widthPx == null) !== (d.heightPx == null)) errors.push(`${where}: widthPx와 heightPx는 함께 있어야 해요`);
  if ((d.widthMm == null) !== (d.heightMm == null)) errors.push(`${where}: widthMm와 heightMm는 함께 있어야 해요`);
}

export function validateConstraints(c: PresetConstraints | undefined, d: PresetDimensions | undefined, where: string, errors: string[]): void {
  if (!c || typeof c !== 'object') { errors.push(`${where}: constraints 없음`); return; }
  if (!Array.isArray(c.acceptedFormats) || c.acceptedFormats.length === 0) errors.push(`${where}: acceptedFormats가 비어 있어요`);
  else for (const f of c.acceptedFormats) if (!FORMATS.includes(f)) errors.push(`${where}: 알 수 없는 형식 ${f}`);
  if (c.preferredFormat && !c.acceptedFormats?.includes(c.preferredFormat)) errors.push(`${where}: preferredFormat이 acceptedFormats에 없어요`);
  if (c.cropMode !== 'cover' && c.cropMode !== 'contain') errors.push(`${where}: cropMode는 cover/contain`);
  if (typeof c.allowDimensionAdjustment !== 'boolean') errors.push(`${where}: allowDimensionAdjustment는 boolean`);
  if (c.maxBytes != null && !isPosInt(c.maxBytes)) errors.push(`${where}: maxBytes는 양의 정수(byte)`);
  for (const k of ['minWidthPx', 'maxWidthPx', 'minHeightPx', 'maxHeightPx'] as const) {
    if (c[k] != null && !isPosInt(c[k])) errors.push(`${where}: ${k}는 양의 정수여야 해요`);
  }
  if (c.minWidthPx != null && c.maxWidthPx != null && c.minWidthPx > c.maxWidthPx) errors.push(`${where}: minWidthPx > maxWidthPx`);
  if (c.minHeightPx != null && c.maxHeightPx != null && c.minHeightPx > c.maxHeightPx) errors.push(`${where}: minHeightPx > maxHeightPx`);
  if (d?.widthPx != null && c.minWidthPx != null && c.maxWidthPx != null && (d.widthPx < c.minWidthPx || d.widthPx > c.maxWidthPx)) {
    errors.push(`${where}: 기본 widthPx가 허용 범위 밖이에요`);
  }
  if (d?.heightPx != null && c.minHeightPx != null && c.maxHeightPx != null && (d.heightPx < c.minHeightPx || d.heightPx > c.maxHeightPx)) {
    errors.push(`${where}: 기본 heightPx가 허용 범위 밖이에요`);
  }
}

/** 공식 카탈로그 검증. 문제 목록(빈 배열이면 통과)을 돌려준다. */
export function validateCatalog(data: unknown): string[] {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || !Array.isArray((data as { presets?: unknown }).presets)) return ['presets 배열이 없어요'];
  const presets = (data as { presets: ImagePreset[] }).presets;
  const ids = new Set<string>();
  for (const p of presets) {
    const where = `preset ${p?.id ?? '(id 없음)'}`;
    if (!p || typeof p.id !== 'string' || !ID_RE.test(p.id)) { errors.push(`${where}: id 형식 오류`); continue; }
    if (ids.has(p.id)) errors.push(`${where}: id 중복`);
    ids.add(p.id);
    if (!p.name?.trim()) errors.push(`${where}: name 없음`);
    if (!KINDS.includes(p.kind)) errors.push(`${where}: kind 오류`);
    if (p.kind === 'custom') errors.push(`${where}: 공식 카탈로그에 custom을 넣을 수 없어요`);
    if (!CATEGORIES.includes(p.category)) errors.push(`${where}: category 오류`);
    if (!STATUSES.includes(p.status)) errors.push(`${where}: status 오류`);
    if (typeof p.enabled !== 'boolean') errors.push(`${where}: enabled는 boolean`);
    if (!isPosInt(p.version)) errors.push(`${where}: version은 양의 정수`);
    if (!Array.isArray(p.guidance?.userNotice) || !Array.isArray(p.guidance?.nonAutomatedChecks)) errors.push(`${where}: guidance 형식 오류`);
    validateDimensions(p.dimensions, where, errors);
    validateConstraints(p.constraints, p.dimensions, where, errors);
    const official = p.kind === 'official-online' || p.kind === 'official-print';
    if (official) {
      const s = p.source;
      if (!s?.organization || !s.url?.startsWith('https://') || !DATE_RE.test(s.checkedAt ?? '') || !Array.isArray(s.evidence) || s.evidence.length === 0) {
        errors.push(`${where}: 공식 프리셋은 기관·https URL·확인일(YYYY-MM-DD)·근거 문구가 필요해요`);
      }
      if (p.status === 'general') errors.push(`${where}: 공식 프리셋의 status는 verified/needs-review`);
      if (p.status === 'needs-review' && p.enabled) errors.push(`${where}: 검증 대기 공식 프리셋은 enabled=false여야 해요`);
    } else if (p.status === 'verified') {
      errors.push(`${where}: 일반 규격은 verified로 표시하지 않아요`);
    }
    if (p.kind === 'official-online' && (p.dimensions?.widthPx == null || p.dimensions?.heightPx == null)) {
      errors.push(`${where}: 온라인 제출 규격은 픽셀이 필요해요`);
    }
  }
  return errors;
}

// ── 사용자 프리셋 저장 스키마 ─────────────────────────────

export const CUSTOM_PRESET_SCHEMA_VERSION = 1;

export interface CustomPresetStoreV1 {
  version: 1;
  presets: CustomPreset[];
}

export function validateCustomPreset(p: CustomPreset): string[] {
  const errors: string[] = [];
  const where = `custom ${p?.id ?? ''}`;
  if (!p || typeof p.id !== 'string' || !p.id) errors.push(`${where}: id 없음`);
  if (!p?.name?.trim()) errors.push(`${where}: 이름 없음`);
  validateDimensions(p?.dimensions, where, errors);
  validateConstraints(p?.constraints, p?.dimensions, where, errors);
  return errors;
}

/**
 * 저장된 문자열을 읽어 사용자 프리셋을 복구한다.
 * - JSON 손상 → 빈 목록 + recovered=true
 * - v0(배열만 저장한 형태) → v1로 이전
 * - 항목별로 검증해 깨진 항목만 버린다
 */
export function parseCustomPresetStore(raw: string | null): { presets: CustomPreset[]; recovered: boolean; dropped: number } {
  if (raw == null || raw === '') return { presets: [], recovered: false, dropped: 0 };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { presets: [], recovered: true, dropped: 0 };
  }
  let list: unknown[];
  let migrated = false;
  if (Array.isArray(data)) {
    list = data;
    migrated = true;
  } else if (data && typeof data === 'object' && (data as { version?: unknown }).version === 1 && Array.isArray((data as CustomPresetStoreV1).presets)) {
    list = (data as CustomPresetStoreV1).presets;
  } else {
    return { presets: [], recovered: true, dropped: 0 };
  }
  const presets: CustomPreset[] = [];
  let dropped = 0;
  for (const item of list) {
    if (validateCustomPreset(item as CustomPreset).length === 0) presets.push(item as CustomPreset);
    else dropped++;
  }
  return { presets, recovered: migrated || dropped > 0, dropped };
}

export function serializeCustomPresetStore(presets: CustomPreset[]): string {
  const store: CustomPresetStoreV1 = { version: CUSTOM_PRESET_SCHEMA_VERSION, presets };
  return JSON.stringify(store);
}
