// 세부 설정(시안 5번 화면) + 변환 중 화면(시안 6번).
// 예상 결과는 지정 품질로 실제 한 번 인코딩해 잰 값이다(추정식 아님).
import { formatBytes, formatLabel, kbToBytes, type OutputFormat } from '@gyushot/image-core';
import { canEncode, convert, estimateBytes, type Stage } from '@gyushot/image-core/browser';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Button, Header, Screen, Segmented, Toggle } from '../../components/ui';
import { hasContentRules, isPrint, outputFileName, specOf } from '../../data/catalog';
import { defaultSettings, useApp, type ExportSettings as Settings } from '../../state/AppState';
import { extensionOf } from '@gyushot/image-core';

const ALL_FORMATS: OutputFormat[] = ['image/jpeg', 'image/png', 'image/webp'];
const BACKGROUNDS = [
  { value: '#ffffff', label: '흰색' },
  { value: '#f2f3f5', label: '연회색' },
  { value: '#000000', label: '검정' },
];

export function ExportSettings() {
  const navigate = useNavigate();
  const { session, preset, setSettings, setResult, addRecent, loadPhoto } = useApp();
  const [support, setSupport] = useState<Record<OutputFormat, boolean> | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [maxInput, setMaxInput] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const estimateSeq = useRef(0);

  useEffect(() => {
    Promise.all(ALL_FORMATS.map(canEncode)).then((r) => setSupport({ 'image/jpeg': r[0], 'image/png': r[1], 'image/webp': r[2] }));
  }, []);

  const settings: Settings | null = session.settings ?? (preset ? defaultSettings(preset) : null);
  const spec = preset ? specOf(preset, settings?.dpi) : null;

  // 예상 용량: 설정이 바뀌면 350ms 뒤 한 번 인코딩
  useEffect(() => {
    if (!session.source || !settings || !spec) return;
    const seq = ++estimateSeq.current;
    setEstimate(null);
    const t = window.setTimeout(() => {
      estimateBytes(session.source!.decoded, {
        output: { width: spec.widthPx, height: spec.heightPx },
        mode: settings.cropMode,
        edit: session.edit,
        background: settings.format === 'image/jpeg' ? settings.background : settings.cropMode === 'contain' ? settings.background : null,
        format: settings.format,
        quality: settings.quality,
        dpi: settings.writeDpi ? settings.dpi : undefined,
      }).then((b) => seq === estimateSeq.current && setEstimate(b), () => undefined);
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.source, session.edit, settings?.format, settings?.quality, settings?.cropMode, settings?.background, settings?.dpi, settings?.writeDpi, spec?.widthPx, spec?.heightPx]);

  if (!preset || !settings || !spec) return <Navigate to="/presets" replace />;
  if (!session.source) return <Navigate to={`/preset/${encodeURIComponent(preset.key)}`} replace />;

  const update = (patch: Partial<Settings>) => {
    setError(null);
    setSettings({ ...settings, ...patch });
  };
  const presetMax = spec.maxBytes;
  const lossy = settings.format !== 'image/png';
  const maxKbText = maxInput ?? (settings.maxBytes != null ? String(Math.round(settings.maxBytes / 1000)) : '');
  const source = session.source;

  const onMaxChange = (v: string) => {
    setMaxInput(v);
    const n = Number(v);
    if (v.trim() === '') update({ maxBytes: presetMax });
    else if (Number.isFinite(n) && n > 0) {
      const bytes = kbToBytes(n);
      // 공식 상한보다 크게는 못 올린다(낮추는 것만 가능)
      update({ maxBytes: presetMax != null ? Math.min(bytes, presetMax) : bytes });
    }
  };

  const run = async () => {
    setError(null);
    const started = performance.now();
    setStage('render');
    const r = await convert(source.decoded, {
      output: { width: spec.widthPx, height: spec.heightPx },
      mode: settings.cropMode,
      edit: session.edit,
      background: settings.format === 'image/jpeg' || settings.cropMode === 'contain' ? settings.background : null,
      format: settings.format,
      quality: settings.quality,
      maxBytes: settings.maxBytes,
      dpi: settings.writeDpi ? settings.dpi : undefined,
      spec: { ...spec, maxBytes: settings.maxBytes ?? spec.maxBytes },
      hasContentRules: hasContentRules(preset),
      onStage: setStage,
    });
    // 단계 표시가 너무 빨리 지나가지 않게 최소 0.9초 유지
    const wait = 900 - (performance.now() - started);
    if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    setStage(null);
    if (!r.ok) {
      if (r.reason === 'too-large') {
        setError(
          lossy
            ? `품질을 최저(40%)까지 낮춰도 ${formatBytes(r.smallestBytes)}라서 ${formatBytes(settings.maxBytes!)} 이하로 맞출 수 없어요. 단순한 배경의 사진을 쓰거나 용량 상한을 확인해 주세요.`
            : `PNG는 무손실이라 ${formatBytes(r.smallestBytes)}보다 줄일 수 없어요. JPG로 바꿔 보세요.`,
        );
      } else if (r.reason === 'format-unsupported') {
        setError(`이 기기 브라우저는 ${formatLabel(settings.format)} 파일을 만들 수 없어요. 다른 형식을 골라 주세요.`);
      } else {
        setError('변환하지 못했어요. 사진이 너무 크거나 기기 메모리가 부족할 수 있어요. 원본은 그대로예요.');
      }
      return;
    }
    const fileName = outputFileName(preset, r.inspected.width, r.inspected.height, extensionOf(settings.format));
    setResult({ blob: r.blob, inspected: r.inspected, report: r.report, quality: r.quality, attempts: r.attempts, elapsedMs: r.elapsedMs, fileName });
    void addRecent({
      presetKey: preset.key,
      presetName: preset.name,
      width: r.inspected.width,
      height: r.inspected.height,
      bytes: r.inspected.bytes,
      format: formatLabel(settings.format),
      at: new Date().toISOString(),
    });
    navigate('/result');
  };

  const exceeds = estimate != null && settings.maxBytes != null && estimate > settings.maxBytes;
  const orientationKnown = source.decoded.exifOrientation !== 1;

  return (
    <Screen className="export">
      <Header title="세부 설정" />

      <section className="field">
        <div className="field__label">
          이미지 품질 <Icon name="info" size={15} />
          <span className="field__value">{lossy ? `${Math.round(settings.quality * 100)}%` : '무손실'}</span>
        </div>
        <input
          type="range"
          className="range"
          min={40}
          max={100}
          step={1}
          value={Math.round(settings.quality * 100)}
          disabled={!lossy}
          onChange={(e) => update({ quality: Number(e.target.value) / 100 })}
          style={{ ['--fill' as string]: `${((settings.quality * 100 - 40) / 60) * 100}%` }}
          aria-label="이미지 품질"
        />
        <p className="field__hint">{lossy ? '고화질과 용량의 균형을 맞춰요. 상한을 넘으면 자동으로 낮춰요.' : 'PNG는 품질 설정 없이 원본 화질로 저장해요.'}</p>
      </section>

      <section className="field">
        <div className="field__label">최대 파일 용량 <Icon name="info" size={15} /></div>
        <div className="input-suffix">
          <input
            className="input"
            inputMode="numeric"
            placeholder="제한 없음"
            value={maxKbText}
            onChange={(e) => onMaxChange(e.target.value.replace(/[^\d.]/g, ''))}
            onBlur={() => setMaxInput(null)}
            aria-label="최대 파일 용량(KB)"
          />
          <span>KB 이하</span>
        </div>
        {presetMax != null ? <p className="field__hint">규격 상한 {formatBytes(presetMax)}({presetMax.toLocaleString('ko-KR')} bytes)보다 크게는 설정할 수 없어요.</p> : null}
      </section>

      <section className="field">
        <div className="field__label">저장 형식</div>
        <Segmented<OutputFormat>
          ariaLabel="저장 형식"
          value={settings.format}
          onChange={(v) => update({ format: v })}
          options={ALL_FORMATS.map((f) => ({
            value: f,
            label: formatLabel(f),
            disabled: !spec.acceptedFormats.includes(f) || support?.[f] === false,
          }))}
        />
        {spec.acceptedFormats.length < 3 ? <p className="field__hint">이 규격은 {spec.acceptedFormats.map(formatLabel).join('·')}만 허용해요.</p> : null}
        {support && !support['image/webp'] ? <p className="field__hint">이 기기에서는 WebP 저장을 지원하지 않아요.</p> : null}
        {settings.format === 'image/webp' && isPrint(preset) ? <p className="field__hint">WebP에는 인화용 DPI 정보를 기록하지 않아요.</p> : null}
      </section>

      {isPrint(preset) ? (
        <section className="field">
          <div className="field__label">인화 해상도</div>
          <Segmented<string>
            ariaLabel="DPI"
            value={String(settings.dpi)}
            onChange={(v) => update({ dpi: Number(v) })}
            options={[150, 300, 600].map((d) => ({ value: String(d), label: `${d}dpi` }))}
          />
          <p className="field__hint">{spec.widthPx} × {spec.heightPx}px로 저장돼요.</p>
        </section>
      ) : null}

      {settings.format === 'image/jpeg' && (source.decoded.format === 'png' || source.decoded.format === 'webp' || settings.cropMode === 'contain') ? (
        <section className="field">
          <div className="field__label">배경색(투명·여백 부분)</div>
          <Segmented<string> ariaLabel="배경색" value={settings.background} onChange={(v) => update({ background: v })} options={BACKGROUNDS} />
        </section>
      ) : null}

      <div className="toggles">
        <Toggle label="EXIF 정보 제거" checked disabled hint="다시 저장하면서 촬영일·위치 정보가 항상 지워져요" />
        <Toggle
          label="방향 보정"
          checked={settings.applyOrientation}
          disabled={!orientationKnown}
          hint={orientationKnown ? '사진의 회전 정보를 반영해요' : '이 사진에는 회전 정보가 없어요'}
          onChange={async (v) => {
            const blob = await fetch(source.url).then((res) => res.blob());
            const r = await loadPhoto(blob, source.name, source.via, v);
            if (r.ok) update({ applyOrientation: v });
          }}
        />
        {spec.dpi != null && settings.format !== 'image/webp' ? (
          <Toggle label="DPI 정보 기록" checked={settings.writeDpi} onChange={(v) => update({ writeDpi: v })} hint={`파일에 ${settings.dpi}dpi를 기록하고 저장 후 다시 읽어 확인해요`} />
        ) : null}
      </div>

      <div className={`estimate${exceeds ? ' estimate--warn' : ''}`}>
        <Icon name="sparkle" size={18} />
        <div>
          <strong>예상 결과</strong>
          <span>
            {estimate == null ? '계산 중…' : `약 ${formatBytes(estimate)}`} · {spec.widthPx} × {spec.heightPx}px
          </span>
          {exceeds ? <small>상한을 넘어서 변환할 때 품질을 자동으로 낮춰요.</small> : null}
        </div>
      </div>

      {error ? <p className="notice notice--error" role="alert">{error}</p> : null}

      <div className="bottom-bar">
        <Button onClick={run} disabled={stage != null}>
          변환하기 <Icon name="bolt" size={18} className="lime-icon" />
        </Button>
      </div>

      {stage ? <ConvertingOverlay stage={stage} /> : null}
    </Screen>
  );
}

const STEPS: { stage: Stage; label: string }[] = [
  { stage: 'render', label: '규격 적용 중' },
  { stage: 'compress', label: '용량 압축 중' },
  { stage: 'verify', label: '최종 확인 중' },
];

function ConvertingOverlay({ stage }: { stage: Stage }) {
  const idx = STEPS.findIndex((s) => s.stage === stage);
  return (
    <div className="overlay" role="alertdialog" aria-modal aria-label="사진 변환 중">
      <div className="overlay__card">
        <div className="spinner-ring" aria-hidden>
          <Icon name="sparkle" size={30} />
        </div>
        <h2>사진을 변환하고 있어요!</h2>
        <p>잠시만 기다려주세요</p>
        <ul className="steps">
          {STEPS.map((s, i) => (
            <li key={s.stage} className={i < idx ? 'is-done' : i === idx ? 'is-active' : ''}>
              <span className="steps__dot"><Icon name="check" size={14} strokeWidth={3} /></span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
