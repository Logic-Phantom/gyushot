// 결과(시안 7번 화면). 표시 값은 모두 결과 파일을 다시 읽은 실제 값이다.
// "통과"는 파일 조건만 뜻한다 — 기관 심사 통과를 보장하는 문구를 쓰지 않는다.
import { formatBytes, summarize, type CheckStatus } from '@gyushot/image-core';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Button, DISCLAIMER, Header, Screen, useToast } from '../../components/ui';
import { saveImage } from '../../platform/image-saver';
import { useApp } from '../../state/AppState';

const STATUS_TEXT: Record<CheckStatus, string> = { pass: '통과', warning: '확인 필요', fail: '실패', unsupported: '확인 불가' };

export function Result() {
  const navigate = useNavigate();
  const toast = useToast();
  const { session, preset } = useApp();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);

  const r = session.result;
  if (!preset || !r || !session.source) return <Navigate to="/" replace />;

  const fileItems = r.report.items.filter((i) => i.id !== 'content');
  const fileStatus = summarize(fileItems.map((i) => i.status));
  const contentCheck = r.report.items.find((i) => i.id === 'content');
  const ok = fileStatus === 'pass' || fileStatus === 'warning';
  const src = session.source.decoded;

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    const res = await saveImage(r.blob, r.fileName);
    setSaving(false);
    if (res.ok) toast(res.via === 'browser-download' ? '다운로드를 시작했어요' : '사진을 저장했어요');
    else setSaveError(res.reason === 'unsupported' ? '현재 토스 앱 버전에서는 파일 저장을 지원하지 않아요. 토스 앱을 업데이트해 주세요.' : '저장하지 못했어요. 다시 시도해 주세요.');
  };

  return (
    <Screen className="result">
      <Header back onBack={() => navigate('/export')} />
      <div className="result__hero">
        {ok ? (
          <div className="check-badge" aria-hidden>
            <span className="confetti confetti--1" /><span className="confetti confetti--2" /><span className="confetti confetti--3" />
            <span className="confetti confetti--4" /><span className="confetti confetti--5" /><span className="confetti confetti--6" />
            <Icon name="check" size={40} strokeWidth={3} />
          </div>
        ) : (
          <div className="check-badge check-badge--fail" aria-hidden><Icon name="x" size={36} strokeWidth={3} /></div>
        )}
        <h1>{ok ? '규격에 딱 맞춰졌어요!' : '규격을 맞추지 못했어요'}</h1>
        <p>{ok ? '설정한 파일 규격을 확인했어요. 이제 저장하고 사용해보세요.' : '아래 실패 항목을 확인하고 다시 변환해 주세요.'}</p>
      </div>

      <div className="result__photo">
        <img src={r.url} alt="변환된 사진" style={{ aspectRatio: `${r.inspected.width} / ${r.inspected.height}` }} />
      </div>

      <dl className="kv kv--card">
        <div><dt>가로 × 세로</dt><dd>{r.inspected.width} × {r.inspected.height} px</dd></div>
        <div><dt>파일 용량</dt><dd>{formatBytes(r.inspected.bytes)}</dd></div>
        <div><dt>파일 형식</dt><dd>{r.inspected.format.toUpperCase().replace('JPEG', 'JPG')}</dd></div>
        {r.inspected.dpi ? <div><dt>해상도 정보</dt><dd>{r.inspected.dpi.x} dpi</dd></div> : null}
      </dl>

      {contentCheck ? (
        <p className="notice notice--warn">
          <Icon name="info" size={16} /> 얼굴 크기·배경·촬영일 등 사진 내용은 앱이 판단하지 않아요. 제출 전 직접 확인해 주세요.
        </p>
      ) : null}

      <button type="button" className="link-btn link-btn--block" aria-expanded={detail} onClick={() => setDetail((v) => !v)}>
        검사 항목 {detail ? '접기' : '자세히 보기'} <Icon name="chevron-right" size={14} style={{ transform: detail ? 'rotate(90deg)' : undefined }} />
      </button>
      {detail ? (
        <div className="checks">
          <ul>
            {r.report.items.map((i) => (
              <li key={i.id} className={`check check--${i.status}`}>
                <span className="check__label">{i.label}</span>
                <span className="check__values">기준 {i.expected} · 결과 {i.actual}</span>
                <span className="check__status">{STATUS_TEXT[i.status]}</span>
              </li>
            ))}
          </ul>
          <p className="fineprint">
            원본 {src.size.width} × {src.size.height}px · {formatBytes(src.bytes)} → 결과 {r.inspected.width} × {r.inspected.height}px · {formatBytes(r.inspected.bytes)}
            {r.quality != null ? ` · 품질 ${Math.round(r.quality * 100)}%` : ''} · 인코딩 {r.attempts}회 · {r.elapsedMs}ms
          </p>
        </div>
      ) : null}

      <p className="fineprint">{DISCLAIMER}</p>
      {saveError ? <p className="notice notice--error" role="alert">{saveError}</p> : null}

      <div className="bottom-bar bottom-bar--stack">
        <Button onClick={onSave} disabled={saving || !ok}>
          <Icon name="download" size={20} /> {saving ? '저장 중…' : '저장하기'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/edit')}>다시 변환하기</Button>
        <button type="button" className="link-btn link-btn--block" onClick={() => navigate('/presets')}>다른 규격으로 만들기</button>
      </div>
    </Screen>
  );
}
