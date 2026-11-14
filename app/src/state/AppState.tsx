// 앱 상태: 저장되는 것(사용자 프리셋·즐겨찾기·최근)과 메모리에만 있는 작업 세션(사진·편집·결과)을 분리한다.
// 사진 Blob/ImageBitmap/Object URL은 세션에만 두고, 바뀌거나 작업을 끝내면 즉시 해제한다(6-4).
import { INITIAL_EDIT, type CropMode, type CustomPreset, type EditState, type InspectedImage, type OutputFormat, type ValidationReport } from '@gyushot/image-core';
import { decodeSource, type DecodedSource, type DecodeError } from '@gyushot/image-core/browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { findPreset, specOf, type AppPreset } from '../data/catalog';
import { logEvent } from '../platform/diagnostics';
import { createRepository, type RecentEntry } from '../storage/preset-repository';

export interface SourcePhoto {
  decoded: DecodedSource;
  /** 미리보기용 Object URL(원본 Blob) */
  url: string;
  name: string;
  via: 'toss-album' | 'file-input' | 'sample';
}

export interface ExportSettings {
  format: OutputFormat;
  /** 0.4~1 */
  quality: number;
  /** 사용자가 정한 용량 상한(byte). undefined면 제한 없음 */
  maxBytes?: number;
  /** EXIF 방향 보정 */
  applyOrientation: boolean;
  /** 인화 규격 DPI */
  dpi: number;
  /** DPI 정보 기록(JPEG/PNG) */
  writeDpi: boolean;
  /** contain 여백·투명 배경 → JPEG 변환 시 채울 색 */
  background: string;
  /** 크롭 방식(공식 규격은 프리셋 값 고정) */
  cropMode: CropMode;
}

export interface ConvertedResult {
  blob: Blob;
  url: string;
  inspected: InspectedImage;
  report: ValidationReport;
  quality: number | null;
  attempts: number;
  elapsedMs: number;
  fileName: string;
}

interface Session {
  presetKey: string | null;
  source: SourcePhoto | null;
  edit: EditState;
  settings: ExportSettings | null;
  result: ConvertedResult | null;
}

const EMPTY: Session = { presetKey: null, source: null, edit: INITIAL_EDIT, settings: null, result: null };

interface AppStateValue {
  ready: boolean;
  onboarded: boolean;
  customs: CustomPreset[];
  favorites: string[];
  recents: RecentEntry[];
  storageNotice: string | null;
  session: Session;
  adhoc: AppPreset | null;
  preset: AppPreset | undefined;
  finishOnboarding(): void;
  selectPreset(key: string): void;
  setAdhoc(p: AppPreset): void;
  loadPhoto(blob: Blob, name: string, via: SourcePhoto['via'], applyOrientation?: boolean): Promise<{ ok: true } | { ok: false; error: DecodeError }>;
  setEdit(e: EditState | ((prev: EditState) => EditState)): void;
  setSettings(s: ExportSettings): void;
  /** 세션 설정이 없으면 프리셋 기본값으로 만든다 */
  ensureSettings(): ExportSettings | null;
  setResult(r: Omit<ConvertedResult, 'url'> | null): void;
  clearSession(): void;
  saveCustom(p: CustomPreset): Promise<void>;
  deleteCustom(id: string): Promise<void>;
  toggleFavorite(key: string): Promise<void>;
  addRecent(e: RecentEntry): Promise<void>;
  clearRecents(): Promise<void>;
  resetAll(): Promise<void>;
}

const Ctx = createContext<AppStateValue | null>(null);
const repo = createRepository();

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(true);
  const [customs, setCustoms] = useState<CustomPreset[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [session, setSession] = useState<Session>(EMPTY);
  const [adhoc, setAdhocState] = useState<AppPreset | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    let alive = true;
    Promise.all([repo.loadCustom(), repo.loadFavorites(), repo.loadRecents(), repo.isOnboarded()]).then(([c, f, r, o]) => {
      if (!alive) return;
      setCustoms(c.presets);
      setFavorites(f);
      setRecents(r);
      setOnboarded(o);
      if (c.recovered) setStorageNotice('저장된 내 프리셋 일부가 손상돼 복구했어요.');
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 앱을 떠날 때 남은 리소스 정리
  useEffect(() => () => releaseSession(sessionRef.current), []);

  const finishOnboarding = useCallback(() => {
    setOnboarded(true);
    repo.setOnboarded().catch(() => undefined);
  }, []);

  const selectPreset = useCallback((key: string) => {
    setSession((s) => {
      if (s.presetKey === key) return s;
      if (s.result) URL.revokeObjectURL(s.result.url);
      // 사진은 유지하고 편집·설정·결과만 새 규격 기준으로 초기화
      return { ...s, presetKey: key, edit: { ...INITIAL_EDIT }, settings: null, result: null };
    });
  }, []);

  const loadPhoto = useCallback<AppStateValue['loadPhoto']>(async (blob, name, via, applyOrientation = true) => {
    const r = await decodeSource(blob, { applyOrientation });
    if (!r.ok) {
      logEvent('decode', `실패 ${r.error} · ${blob.type || '형식 없음'} · ${blob.size} bytes`);
      return r;
    }
    logEvent('decode', `${r.source.format} ${r.source.size.width}×${r.source.size.height} · ${blob.size} bytes · EXIF 방향 ${r.source.exifOrientation} · ${via}`);
    const url = URL.createObjectURL(blob);
    setSession((s) => {
      releaseSource(s.source);
      if (s.result) URL.revokeObjectURL(s.result.url);
      return { ...s, source: { decoded: r.source, url, name, via }, edit: { ...INITIAL_EDIT }, result: null };
    });
    return { ok: true };
  }, []);

  const setEdit = useCallback<AppStateValue['setEdit']>((e) => {
    setSession((s) => ({ ...s, edit: typeof e === 'function' ? e(s.edit) : e }));
  }, []);

  const setSettings = useCallback((settings: ExportSettings) => setSession((s) => ({ ...s, settings })), []);

  const setResult = useCallback<AppStateValue['setResult']>((r) => {
    // URL은 갱신 함수 밖에서 한 번만 만든다(StrictMode에서 갱신 함수가 두 번 실행돼도 새지 않게)
    const url = r ? URL.createObjectURL(r.blob) : null;
    setSession((s) => {
      if (s.result && s.result.url !== url) URL.revokeObjectURL(s.result.url);
      return { ...s, result: r && url ? { ...r, url } : null };
    });
  }, []);

  const clearSession = useCallback(() => {
    setSession((s) => {
      releaseSession(s);
      return EMPTY;
    });
  }, []);

  const saveCustom = useCallback(async (p: CustomPreset) => {
    const next = [...customs.filter((c) => c.id !== p.id), p];
    await repo.saveCustom(next);
    setCustoms(next);
  }, [customs]);

  const deleteCustom = useCallback(async (id: string) => {
    const next = customs.filter((c) => c.id !== id);
    await repo.saveCustom(next);
    setCustoms(next);
    const fav = favorites.filter((k) => k !== `custom:${id}`);
    if (fav.length !== favorites.length) {
      await repo.saveFavorites(fav);
      setFavorites(fav);
    }
  }, [customs, favorites]);

  const toggleFavorite = useCallback(async (key: string) => {
    const next = favorites.includes(key) ? favorites.filter((k) => k !== key) : [...favorites, key];
    await repo.saveFavorites(next);
    setFavorites(next);
  }, [favorites]);

  const addRecent = useCallback(async (e: RecentEntry) => {
    try {
      setRecents(await repo.addRecent(e, recents));
    } catch {
      /* 최근 기록 저장 실패는 결과 화면에 영향 없음 */
    }
  }, [recents]);

  const clearRecents = useCallback(async () => {
    await repo.clearRecents();
    setRecents([]);
  }, []);

  const resetAll = useCallback(async () => {
    await repo.resetAll();
    setCustoms([]);
    setFavorites(await repo.loadFavorites());
    setRecents([]);
  }, []);

  const preset = session.presetKey ? findPreset(session.presetKey, customs, adhoc) : undefined;

  const ensureSettings = useCallback((): ExportSettings | null => {
    if (session.settings) return session.settings;
    if (!preset) return null;
    const s = defaultSettings(preset);
    setSession((prev) => (prev.settings ? prev : { ...prev, settings: s }));
    return s;
  }, [session.settings, preset]);

  const value = useMemo<AppStateValue>(() => ({
    ready, onboarded, customs, favorites, recents, storageNotice, session, adhoc, preset,
    finishOnboarding, selectPreset, setAdhoc: setAdhocState, loadPhoto, setEdit, setSettings, ensureSettings, setResult, clearSession,
    saveCustom, deleteCustom, toggleFavorite, addRecent, clearRecents, resetAll,
  }), [ready, onboarded, customs, favorites, recents, storageNotice, session, adhoc, preset, finishOnboarding, selectPreset, loadPhoto, setEdit, setSettings, ensureSettings, setResult, clearSession, saveCustom, deleteCustom, toggleFavorite, addRecent, clearRecents, resetAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function releaseSource(src: SourcePhoto | null) {
  if (!src) return;
  URL.revokeObjectURL(src.url);
  src.decoded.bitmap.close();
}

function releaseSession(s: Session) {
  releaseSource(s.source);
  if (s.result) URL.revokeObjectURL(s.result.url);
}

export function useApp(): AppStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppStateProvider 밖에서 useApp을 호출했어요');
  return v;
}

export const DEFAULT_QUALITY = 0.8;

export function defaultSettings(preset: AppPreset): ExportSettings {
  const spec = specOf(preset);
  return {
    format: spec.preferredFormat,
    quality: DEFAULT_QUALITY,
    maxBytes: spec.maxBytes,
    applyOrientation: true,
    dpi: spec.dpi ?? 300,
    writeDpi: spec.dpi != null,
    background: '#ffffff',
    cropMode: spec.cropMode,
  };
}
