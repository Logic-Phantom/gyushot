// 공식/일반 카탈로그 + 사용자 프리셋을 화면용 한 형태(AppPreset)로 묶는다.
import {
  formatBytes,
  formatLabel,
  formatPrintSize,
  ratioLabel,
  resolveSpec,
  type CustomPreset,
  type ImagePreset,
  type PresetKind,
  type ResolvedSpec,
} from '@gyushot/image-core';
import type { IconName } from '../components/Icon';
import catalogJson from './presets.ko-KR.json';

export const CATALOG = catalogJson as unknown as { catalogVersion: number; checkedAt: string; presets: ImagePreset[] };

export type PresetLabel = '공식' | '일반' | 'MY';

export interface AppPreset {
  /** 'catalog:<id>' | 'custom:<id>' | 'adhoc' */
  key: string;
  name: string;
  shortDescription: string;
  kind: PresetKind;
  label: PresetLabel;
  icon: IconName;
  enabled: boolean;
  status: ImagePreset['status'] | 'custom';
  base: Pick<ImagePreset, 'dimensions' | 'constraints'>;
  guidance: ImagePreset['guidance'];
  source?: ImagePreset['source'];
  /** 사용자 프리셋 원본(수정·삭제용) */
  custom?: CustomPreset;
}

export const labelOf = (kind: PresetKind): PresetLabel =>
  kind === 'custom' ? 'MY' : kind === 'common-print' ? '일반' : '공식';

export function fromCatalog(p: ImagePreset): AppPreset {
  return {
    key: `catalog:${p.id}`,
    name: p.name,
    shortDescription: p.shortDescription,
    kind: p.kind,
    label: labelOf(p.kind),
    icon: (p.icon as IconName) ?? 'image',
    enabled: p.enabled,
    status: p.status,
    base: { dimensions: p.dimensions, constraints: p.constraints },
    guidance: p.guidance,
    source: p.source,
  };
}

export function fromCustom(c: CustomPreset, key = `custom:${c.id}`): AppPreset {
  return {
    key,
    name: c.name,
    shortDescription: sizeText({ dimensions: c.dimensions, constraints: c.constraints }),
    kind: 'custom',
    label: 'MY',
    icon: 'sliders',
    enabled: true,
    status: 'custom',
    base: { dimensions: c.dimensions, constraints: c.constraints },
    guidance: { userNotice: [], nonAutomatedChecks: [] },
    custom: c,
  };
}

export const CATALOG_PRESETS: AppPreset[] = CATALOG.presets.map(fromCatalog);

export function findPreset(key: string, customs: CustomPreset[], adhoc: AppPreset | null): AppPreset | undefined {
  if (key === 'adhoc') return adhoc ?? undefined;
  if (key.startsWith('catalog:')) return CATALOG_PRESETS.find((p) => p.key === key);
  if (key.startsWith('custom:')) {
    const c = customs.find((x) => `custom:${x.id}` === key);
    return c ? fromCustom(c) : undefined;
  }
  return undefined;
}

export function specOf(p: Pick<AppPreset, 'base'>, dpi?: number): ResolvedSpec {
  return resolveSpec(p.base, dpi);
}

/** 프리셋 크기 표기: 인화 규격은 cm, 온라인 규격은 px */
export function sizeText(p: Pick<ImagePreset, 'dimensions' | 'constraints'>): string {
  const d = p.dimensions;
  if (d.widthPx != null && d.heightPx != null) return `${d.widthPx} × ${d.heightPx}px`;
  if (d.widthMm != null && d.heightMm != null) return formatPrintSize(d.widthMm, d.heightMm);
  return '';
}

/** 목록 부제: 크기 · 용량 · 형식 */
export function presetSubtitle(p: AppPreset): string {
  const parts = [sizeText(p.base)];
  if (p.base.constraints.maxBytes) parts.push(`${formatBytes(p.base.constraints.maxBytes)} 이하`);
  if (p.kind === 'official-online') parts.push(p.base.constraints.acceptedFormats.map(formatLabel).join('/'));
  return parts.filter(Boolean).join(' · ');
}

export function ratioChipLabel(p: AppPreset): string {
  const d = p.base.dimensions;
  // 인화 크기가 있으면 cm 비율 그대로(3:4, 3.5:4.5, 5:7), 없으면 픽셀을 약분한 비율
  if (d.widthMm != null && d.heightMm != null) return `${d.widthMm / 10}:${d.heightMm / 10}`;
  return ratioLabel(d.widthPx ?? 1, d.heightPx ?? 1);
}

/** 인화 규격인지(DPI 선택 가능) */
export const isPrint = (p: AppPreset) => p.base.dimensions.widthPx == null && p.base.dimensions.widthMm != null;

/** 사진 내용 규정(얼굴·배경·촬영일)이 있는 프리셋 */
export const hasContentRules = (p: AppPreset) => p.guidance.nonAutomatedChecks.length > 0;

export const ICON_TONE: Partial<Record<IconName, 'blue' | 'yellow' | 'lime'>> = {
  globe: 'blue', idcard: 'blue', car: 'blue', image: 'blue', doc: 'blue', star: 'yellow', sliders: 'lime', plane: 'blue',
};

/** 결과 파일 이름(ASCII — 한글 파일명은 실기기 확인 전이라 쓰지 않음, D-013) */
export function outputFileName(p: AppPreset, w: number, h: number, ext: string, now = new Date()): string {
  const id = p.key.startsWith('catalog:') ? p.key.slice(8) : 'custom';
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `jechul_${id}_${w}x${h}_${stamp}.${ext}`;
}
