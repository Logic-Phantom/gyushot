import { validateCatalog } from '@gyushot/image-core';
import { describe, expect, it } from 'vitest';
import { CATALOG, CATALOG_PRESETS, fromCustom, outputFileName, presetSubtitle, ratioChipLabel, specOf } from '../src/data/catalog';
import { memoryStore } from '../src/storage/kv';
import { createRepository, DEFAULT_FAVORITES, KEYS } from '../src/storage/preset-repository';

const byId = (id: string) => CATALOG_PRESETS.find((p) => p.key === `catalog:${id}`)!;

describe('카탈로그', () => {
  it('JSON이 검증을 통과', () => {
    expect(validateCatalog(CATALOG)).toEqual([]);
  });
  it('여권 온라인: 413×531, 500,000 bytes, JPG, 공식', () => {
    const p = byId('passport-online-kr');
    const s = specOf(p);
    expect([s.widthPx, s.heightPx, s.maxBytes, s.minWidthPx, s.maxHeightPx]).toEqual([413, 531, 500_000, 395, 550]);
    expect(s.acceptedFormats).toEqual(['image/jpeg']);
    expect(p.label).toBe('공식');
    expect(presetSubtitle(p)).toBe('413 × 531px · 500 KB 이하 · JPG');
  });
  it('인화 규격은 DPI 환산, 일반 규격은 일반 라벨', () => {
    const half = byId('half-print-generic');
    expect(half.label).toBe('일반');
    expect([specOf(half).widthPx, specOf(half).heightPx]).toEqual([354, 472]);
    expect([specOf(half, 600).widthPx, specOf(half, 600).heightPx]).toEqual([709, 945]);
    expect(ratioChipLabel(half)).toBe('3:4');
    expect(ratioChipLabel(byId('passport-print-kr'))).toBe('3.5:4.5');
    expect(ratioChipLabel(byId('namecard-print-generic'))).toBe('5:7');
  });
  it('검증 대기 규격은 비활성', () => {
    expect(byId('qnet-online-kr').enabled).toBe(false);
  });
  it('결과 파일 이름은 ASCII', () => {
    const name = outputFileName(byId('passport-online-kr'), 413, 531, 'jpg', new Date(2026, 10, 14, 9, 5, 7));
    expect(name).toBe('jechul_passport-online-kr_413x531_20261114-090507.jpg');
    expect(/^[\x20-\x7e]+$/.test(name)).toBe(true);
  });
  it('사용자 프리셋은 MY 라벨', () => {
    const p = fromCustom({
      id: 'a', name: '내 규격', createdAt: '', updatedAt: '',
      dimensions: { widthPx: 450, heightPx: 600 },
      constraints: { acceptedFormats: ['image/png'], cropMode: 'contain', allowDimensionAdjustment: false },
    });
    expect(p.label).toBe('MY');
    expect(p.key).toBe('custom:a');
    expect(specOf(p).cropMode).toBe('contain');
  });
});

describe('저장소', () => {
  it('사용자 프리셋 저장·복구, 손상 시 복구 후 재저장', async () => {
    const kv = memoryStore();
    const repo = createRepository(kv);
    await kv.set(KEYS.custom, '{broken');
    const r = await repo.loadCustom();
    expect(r).toEqual({ presets: [], recovered: true });
    expect(JSON.parse((await kv.get(KEYS.custom))!)).toEqual({ version: 1, presets: [] });
  });
  it('즐겨찾기 기본값과 저장', async () => {
    const repo = createRepository(memoryStore());
    expect(await repo.loadFavorites()).toEqual(DEFAULT_FAVORITES);
    await repo.saveFavorites(['catalog:half-print-generic']);
    expect(await repo.loadFavorites()).toEqual(['catalog:half-print-generic']);
  });
  it('최근 작업은 최대 20개, 사진 데이터 없음', async () => {
    const kv = memoryStore();
    const repo = createRepository(kv);
    let list = await repo.loadRecents();
    for (let i = 0; i < 25; i++) {
      list = await repo.addRecent({ presetKey: 'catalog:x', presetName: 'x', width: 1, height: 1, bytes: i, format: 'JPG', at: new Date(i).toISOString() }, list);
    }
    expect(list).toHaveLength(20);
    const raw = (await kv.get(KEYS.recents))!;
    expect(raw).not.toMatch(/data:|base64|blob:/);
  });
});
