// 기기 로컬 저장: 사용자 프리셋·즐겨찾기·최근 사용·앱 설정. 사진·파일명·EXIF는 저장하지 않는다.
import { parseCustomPresetStore, serializeCustomPresetStore, type CustomPreset } from '@gyushot/image-core';
import { store, type KeyValueStore } from './kv';

export const KEYS = {
  custom: 'gyushot.customPresets',
  favorites: 'gyushot.favorites.v1',
  recents: 'gyushot.recents.v1',
  onboarded: 'gyushot.onboarded.v1',
} as const;

/** 최근 작업: 프리셋 키와 결과 요약만(사진 없음) */
export interface RecentEntry {
  presetKey: string;
  presetName: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  at: string;
}

export const DEFAULT_FAVORITES = ['catalog:passport-online-kr'];
const MAX_RECENTS = 20;

function parseStringArray(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : null;
  } catch {
    return null;
  }
}

function parseRecents(raw: string | null): RecentEntry[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((r) => r && typeof r.presetKey === 'string' && typeof r.width === 'number' && typeof r.at === 'string');
  } catch {
    return [];
  }
}

export function createRepository(kv: KeyValueStore = store) {
  return {
    async loadCustom(): Promise<{ presets: CustomPreset[]; recovered: boolean }> {
      const r = parseCustomPresetStore(await kv.get(KEYS.custom));
      if (r.recovered) {
        // 복구한 내용으로 다시 저장해 다음부터 같은 오류가 나지 않게 한다(실패해도 화면은 계속)
        try { await kv.set(KEYS.custom, serializeCustomPresetStore(r.presets)); } catch { /* 무시 */ }
      }
      return { presets: r.presets, recovered: r.recovered };
    },
    saveCustom: (presets: CustomPreset[]) => kv.set(KEYS.custom, serializeCustomPresetStore(presets)),

    async loadFavorites(): Promise<string[]> {
      return parseStringArray(await kv.get(KEYS.favorites)) ?? DEFAULT_FAVORITES;
    },
    saveFavorites: (keys: string[]) => kv.set(KEYS.favorites, JSON.stringify(keys)),

    async loadRecents(): Promise<RecentEntry[]> {
      return parseRecents(await kv.get(KEYS.recents));
    },
    async addRecent(entry: RecentEntry, current: RecentEntry[]): Promise<RecentEntry[]> {
      const next = [entry, ...current].slice(0, MAX_RECENTS);
      await kv.set(KEYS.recents, JSON.stringify(next));
      return next;
    },
    clearRecents: () => kv.remove(KEYS.recents),

    async isOnboarded(): Promise<boolean> {
      return (await kv.get(KEYS.onboarded)) === '1';
    },
    setOnboarded: () => kv.set(KEYS.onboarded, '1'),

    async resetAll(): Promise<void> {
      await Promise.all([kv.remove(KEYS.custom), kv.remove(KEYS.favorites), kv.remove(KEYS.recents)]);
    },
  };
}

export type PresetRepository = ReturnType<typeof createRepository>;
