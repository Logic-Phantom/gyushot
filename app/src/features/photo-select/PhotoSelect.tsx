// 규격 상세 + 사진 선택. 권한은 '앨범에서 사진 선택'을 눌렀을 때만 요청된다.
import { formatBytes, formatLabel, formatPrintSize } from '@gyushot/image-core';
import { MAX_INPUT_BYTES } from '@gyushot/image-core/browser';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Badge, Button, DISCLAIMER, Header, IconTile, Screen, useToast } from '../../components/ui';
import { findPreset, specOf, type AppPreset } from '../../data/catalog';
import { ID_SAMPLES, OTHER_SAMPLES, loadSampleBlob, type Sample } from '../../data/samples';
import { pickImage } from '../../platform/image-picker';
import { useApp } from '../../state/AppState';
import { decodeErrorMessage } from '../messages';

export function PhotoSelect() {
  const { key = '' } = useParams();
  const presetKey = decodeURIComponent(key);
  const navigate = useNavigate();
  const toast = useToast();
  const { session, customs, adhoc, selectPreset, loadPhoto, favorites, toggleFavorite, ready } = useApp();
  // 주소의 규격을 바로 찾는다(세션 반영은 아래 effect에서)
  const preset = findPreset(presetKey, customs, adhoc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllSamples, setShowAllSamples] = useState(false);

  useEffect(() => {
    if (preset?.enabled) selectPreset(presetKey);
  }, [presetKey, preset?.enabled, selectPreset]);

  if (!ready) return <Screen><Header /></Screen>;
  if (!preset) {
    return (
      <Screen>
        <Header title="규격" />
        <p className="empty">규격을 찾을 수 없어요.</p>
        <Button onClick={() => navigate('/presets')}>규격 다시 고르기</Button>
      </Screen>
    );
  }
  if (!preset.enabled) {
    return (
      <Screen>
        <Header title={preset.name} />
        <p className="notice">이 규격은 공식 안내를 확인하는 중이라 아직 쓸 수 없어요.</p>
      </Screen>
    );
  }

  const fav = favorites.includes(presetKey);

  const afterLoad = async (p: Promise<{ ok: true } | { ok: false; error: Parameters<typeof decodeErrorMessage>[0] }>) => {
    const r = await p;
    if (r.ok) navigate('/edit');
    else setError(decodeErrorMessage(r.error));
  };

  const onPick = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await pickImage();
      if (!r.ok) {
        if (r.reason === 'denied') setError('앨범 접근이 허용되지 않았어요. 토스 앱 권한 설정에서 사진 접근을 허용한 뒤 다시 시도해 주세요.');
        else if (r.reason === 'unsupported') setError('현재 토스 앱 버전에서는 사진 선택을 지원하지 않아요. 토스 앱을 업데이트해 주세요.');
        else if (r.reason === 'failed') setError('사진을 불러오지 못했어요. 다시 시도해 주세요.');
        return;
      }
      if (r.blob.size > MAX_INPUT_BYTES) {
        setError(`${formatBytes(MAX_INPUT_BYTES)}보다 큰 사진은 처리할 수 없어요.`);
        return;
      }
      await afterLoad(loadPhoto(r.blob, r.name, r.via));
    } finally {
      setBusy(false);
    }
  };

  const onSample = async (s: Sample) => {
    setError(null);
    setBusy(true);
    try {
      const blob = await loadSampleBlob(s);
      await afterLoad(loadPhoto(blob, s.id, 'sample'));
    } catch {
      setError('예시 사진을 불러오지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="photo-select">
      <Header
        title={preset.name}
        right={
          <button
            type="button"
            className={`icon-btn${fav ? ' is-fav' : ''}`}
            aria-label={fav ? '내 프리셋에서 빼기' : '내 프리셋에 담기'}
            aria-pressed={fav}
            onClick={() => toggleFavorite(presetKey).then(() => toast(fav ? '내 프리셋에서 뺐어요' : '내 프리셋에 담았어요'), () => toast('저장하지 못했어요'))}
          >
            <Icon name="heart" size={22} filled={fav} />
          </button>
        }
      />
      <SpecCard preset={preset} />

      {session.source ? (
        <div className="current-photo">
          <img src={session.source.url} alt="선택한 사진" />
          <div>
            <strong>선택한 사진</strong>
            <span>{session.source.decoded.size.width} × {session.source.decoded.size.height}px · {formatBytes(session.source.decoded.bytes)}</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="notice notice--error" role="alert">{error}</p> : null}

      <div className="stack">
        {session.source ? (
          <Button onClick={() => navigate('/edit')} disabled={busy}>
            이 사진으로 계속하기 <Icon name="arrow-right" size={20} />
          </Button>
        ) : null}
        <Button variant={session.source ? 'outline' : 'primary'} onClick={onPick} disabled={busy}>
          <Icon name="album" size={20} /> {session.source ? '다른 사진 선택' : '앨범에서 사진 선택'}
        </Button>
      </div>

      <div className="section-head">
        <h2>예시 사진으로 해보기</h2>
        <button type="button" className="link-btn" onClick={() => setShowAllSamples((v) => !v)}>
          {showAllSamples ? '접기' : '더 보기'}
        </button>
      </div>
      <div className="sample-grid">
        {(showAllSamples ? [...ID_SAMPLES, ...OTHER_SAMPLES] : ID_SAMPLES).map((s) => (
          <button key={s.id} type="button" className="sample-thumb" onClick={() => onSample(s)} disabled={busy} aria-label={`${s.alt}로 해보기`}>
            <img src={s.file} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <p className="fineprint">JPG·PNG·WebP를 지원해요. HEIC는 기기 브라우저가 열 수 있을 때만 처리돼요.</p>
    </Screen>
  );
}

export function SpecCard({ preset }: { preset: AppPreset }) {
  const spec = specOf(preset);
  const d = preset.base.dimensions;
  const rows: [string, string][] = [];
  rows.push(['출력 픽셀', `${spec.widthPx} × ${spec.heightPx}px${d.widthPx == null ? ` (${spec.dpi}dpi 환산)` : ''}`]);
  if (spec.minWidthPx != null && spec.maxWidthPx != null) {
    rows.push(['허용 범위', `가로 ${spec.minWidthPx}~${spec.maxWidthPx} · 세로 ${spec.minHeightPx}~${spec.maxHeightPx}px`]);
  }
  if (spec.printMm) rows.push(['인화 크기', formatPrintSize(spec.printMm.width, spec.printMm.height)]);
  if (spec.maxBytes) rows.push(['파일 용량', `${formatBytes(spec.maxBytes)} 이하`]);
  rows.push(['파일 형식', spec.acceptedFormats.map(formatLabel).join(' / ')]);
  return (
    <section className="spec-card">
      <div className="spec-card__head">
        <IconTile icon={preset.icon} size={40} />
        <div>
          <strong>{preset.name}</strong> <Badge label={preset.label} />
          <span className="spec-card__kind">
            {preset.kind === 'official-online' ? '공식 온라인 제출 규격' : preset.kind === 'official-print' ? '공식 인화 규격' : preset.kind === 'common-print' ? '일반 인화 규격' : '내 규격'}
          </span>
        </div>
      </div>
      <dl className="kv">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {preset.guidance.userNotice.length > 0 ? (
        <ul className="notice-list">
          {preset.guidance.userNotice.map((n) => <li key={n}>{n}</li>)}
        </ul>
      ) : null}
      {preset.source ? (
        <p className="source-line">
          출처: {preset.source.organization} · 확인일 {preset.source.checkedAt}
          <br />
          <span className="source-url">{preset.source.url}</span>
        </p>
      ) : null}
      {preset.label === '공식' ? <p className="fineprint">{DISCLAIMER}</p> : null}
    </section>
  );
}
