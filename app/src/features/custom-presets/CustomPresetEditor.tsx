// 내 규격 만들기/수정. 픽셀 또는 인화 크기(cm/mm)+DPI로 입력하고, 기기에만 저장한다.
// ?use=1: 저장 후 바로 사진 선택으로 이동(직접 설정하기). ?from=<key>: 기존 규격 복제.
import { formatLabel, kbToBytes, mmToPx, validateCustomPreset, type CropMode, type CustomPreset, type OutputFormat } from '@gyushot/image-core';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Header, Screen, Segmented, useToast } from '../../components/ui';
import { findPreset, fromCustom } from '../../data/catalog';
import { useApp } from '../../state/AppState';

type Unit = 'px' | 'cm' | 'mm';

interface Form {
  name: string;
  unit: Unit;
  width: string;
  height: string;
  dpi: string;
  maxKb: string;
  format: OutputFormat;
  cropMode: CropMode;
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

function initialForm(base?: CustomPreset | null, nameSuffix = ''): Form {
  if (!base) return { name: '', unit: 'px', width: '', height: '', dpi: '300', maxKb: '', format: 'image/jpeg', cropMode: 'cover' };
  const d = base.dimensions;
  const usePx = d.widthPx != null;
  return {
    name: base.name + nameSuffix,
    unit: usePx ? 'px' : 'cm',
    width: String(usePx ? d.widthPx : (d.widthMm ?? 0) / 10),
    height: String(usePx ? d.heightPx : (d.heightMm ?? 0) / 10),
    dpi: String(d.dpi ?? 300),
    maxKb: base.constraints.maxBytes ? String(Math.round(base.constraints.maxBytes / 1000)) : '',
    format: base.constraints.preferredFormat ?? base.constraints.acceptedFormats[0] ?? 'image/jpeg',
    cropMode: base.constraints.cropMode,
  };
}

export function CustomPresetEditor() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [params] = useSearchParams();
  const useNow = params.get('use') === '1';
  const from = params.get('from');
  const { customs, adhoc, saveCustom, selectPreset, setAdhoc } = useApp();

  const editing = id ? customs.find((c) => c.id === decodeURIComponent(id)) ?? null : null;
  const source = useMemo(() => {
    if (editing) return editing;
    if (!from) return null;
    const p = findPreset(from, customs, adhoc);
    if (!p) return null;
    return { id: '', name: p.name, createdAt: '', updatedAt: '', dimensions: p.base.dimensions, constraints: p.base.constraints } as CustomPreset;
  }, [editing, from, customs, adhoc]);
  const [form, setForm] = useState<Form>(() => initialForm(source, editing ? '' : source ? ' (내 규격)' : ''));
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const w = num(form.width);
  const h = num(form.height);
  const dpi = Math.round(num(form.dpi));
  const toMm = (v: number) => (form.unit === 'cm' ? v * 10 : v);
  const pxW = form.unit === 'px' ? Math.round(w) : mmToPx(toMm(w), dpi);
  const pxH = form.unit === 'px' ? Math.round(h) : mmToPx(toMm(h), dpi);
  const validPx = Number.isFinite(pxW) && Number.isFinite(pxH) && pxW > 0 && pxH > 0;

  const build = (): CustomPreset | null => {
    const now = new Date().toISOString();
    const maxKb = form.maxKb.trim() ? num(form.maxKb) : undefined;
    if (maxKb != null && !Number.isFinite(maxKb)) { setError('최대 용량은 0보다 큰 숫자로 입력해 주세요.'); return null; }
    if (!validPx) { setError('가로·세로를 0보다 큰 숫자로 입력해 주세요.'); return null; }
    if (pxW > 6000 || pxH > 6000) { setError('가로·세로는 6000px 이하로 설정해 주세요.'); return null; }
    const p: CustomPreset = {
      id: editing?.id ?? `c${Date.now().toString(36)}`,
      name: form.name.trim() || `${pxW}×${pxH} 규격`,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
      basedOnPresetId: from ?? editing?.basedOnPresetId,
      dimensions: form.unit === 'px'
        ? { widthPx: pxW, heightPx: pxH }
        : { widthMm: toMm(w), heightMm: toMm(h), dpi },
      constraints: {
        acceptedFormats: [form.format],
        preferredFormat: form.format,
        cropMode: form.cropMode,
        allowDimensionAdjustment: false,
        maxBytes: maxKb != null ? kbToBytes(maxKb) : undefined,
      },
    };
    if (p.constraints.maxBytes == null) delete p.constraints.maxBytes;
    if (p.basedOnPresetId == null) delete p.basedOnPresetId;
    const errs = validateCustomPreset(p);
    if (errs.length) { setError(errs[0]); return null; }
    return p;
  };

  const onSave = async () => {
    setError(null);
    const p = build();
    if (!p) return;
    try {
      await saveCustom(p);
    } catch {
      setError('기기에 저장하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    toast('내 프리셋에 저장했어요');
    if (useNow) {
      selectPreset(`custom:${p.id}`);
      navigate(`/preset/${encodeURIComponent(`custom:${p.id}`)}`, { replace: true });
    } else navigate('/my', { replace: true });
  };

  const onUseOnce = () => {
    setError(null);
    const p = build();
    if (!p) return;
    setAdhoc(fromCustom(p, 'adhoc'));
    navigate(`/preset/adhoc`, { replace: true });
  };

  return (
    <Screen className="custom-editor">
      <Header title={editing ? '내 규격 수정' : '직접 설정하기'} />

      <section className="field">
        <label className="field__label" htmlFor="cp-name">규격 이름</label>
        <input id="cp-name" className="input" value={form.name} maxLength={30} placeholder="예: 취업 지원 사진" onChange={(e) => set({ name: e.target.value })} />
      </section>

      <section className="field">
        <div className="field__label">크기 단위</div>
        <Segmented<Unit>
          ariaLabel="크기 단위"
          value={form.unit}
          onChange={(v) => set({ unit: v, width: '', height: '' })}
          options={[{ value: 'px', label: '픽셀(px)' }, { value: 'cm', label: 'cm' }, { value: 'mm', label: 'mm' }]}
        />
      </section>

      <section className="field field--row">
        <label>
          <span className="field__label">가로</span>
          <span className="input-suffix"><input className="input" inputMode="decimal" value={form.width} onChange={(e) => set({ width: e.target.value })} aria-label={`가로(${form.unit})`} /><span>{form.unit}</span></span>
        </label>
        <span className="times" aria-hidden>×</span>
        <label>
          <span className="field__label">세로</span>
          <span className="input-suffix"><input className="input" inputMode="decimal" value={form.height} onChange={(e) => set({ height: e.target.value })} aria-label={`세로(${form.unit})`} /><span>{form.unit}</span></span>
        </label>
      </section>

      {form.unit !== 'px' ? (
        <section className="field">
          <div className="field__label">해상도(DPI)</div>
          <Segmented<string>
            ariaLabel="DPI"
            value={form.dpi}
            onChange={(v) => set({ dpi: v })}
            options={['150', '300', '600'].map((d) => ({ value: d, label: `${d}dpi` }))}
          />
        </section>
      ) : null}
      <p className="calc-line">{validPx ? `저장 크기 ${pxW} × ${pxH}px` : '크기를 입력하면 픽셀을 계산해요'}</p>

      <section className="field">
        <div className="field__label">최대 파일 용량(선택)</div>
        <span className="input-suffix"><input className="input" inputMode="numeric" placeholder="제한 없음" value={form.maxKb} onChange={(e) => set({ maxKb: e.target.value.replace(/[^\d.]/g, '') })} aria-label="최대 파일 용량(KB)" /><span>KB 이하</span></span>
      </section>

      <section className="field">
        <div className="field__label">저장 형식</div>
        <Segmented<OutputFormat>
          ariaLabel="저장 형식"
          value={form.format}
          onChange={(v) => set({ format: v })}
          options={(['image/jpeg', 'image/png', 'image/webp'] as OutputFormat[]).map((f) => ({ value: f, label: formatLabel(f) }))}
        />
      </section>

      <section className="field">
        <div className="field__label">맞추는 방식</div>
        <Segmented<CropMode>
          ariaLabel="맞추는 방식"
          value={form.cropMode}
          onChange={(v) => set({ cropMode: v })}
          options={[{ value: 'cover', label: '꽉 채우기' }, { value: 'contain', label: '전체 보기(여백)' }]}
        />
      </section>

      {error ? <p className="notice notice--error" role="alert">{error}</p> : null}

      <div className="bottom-bar bottom-bar--stack">
        <Button onClick={onSave}>{useNow ? '저장하고 사진 고르기' : '저장하기'}</Button>
        {useNow ? <Button variant="outline" onClick={onUseOnce}>저장하지 않고 이번만 쓰기</Button> : null}
      </div>
    </Screen>
  );
}
