// 더보기 / 설정: 파일 처리 정책, 공식 규격 출처, 오픈소스 라이선스, 초기화.
import { useState } from 'react';
import { collectDiagnostics, recentEvents, type DiagInfo } from '../../platform/diagnostics';
import { Icon } from '../../components/Icon';
import { DISCLAIMER, Header, Screen, useToast } from '../../components/ui';
import { BRAND } from '../../brand';
import { CATALOG } from '../../data/catalog';
import ossLicenses from '../../legal/oss-licenses.json';
import { useApp } from '../../state/AppState';

interface Oss {
  packages: { name: string; version: string; license: string; copyright: string[]; textId: string | null }[];
  texts: Record<string, string>;
}

export function More() {
  const toast = useToast();
  const { resetAll, customs } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [diag, setDiag] = useState<DiagInfo | null>(null);
  const oss = ossLicenses as Oss;
  const officials = CATALOG.presets.filter((p) => p.source);

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section className="more-section">
      <button type="button" className="more-section__head" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
        {title}
        <Icon name="chevron-right" size={18} style={{ transform: open === id ? 'rotate(90deg)' : undefined }} />
      </button>
      {open === id ? <div className="more-section__body">{children}</div> : null}
    </section>
  );

  return (
    <Screen tabBar className="more">
      <Header title="더보기" back={false} />

      <Section id="privacy" title="사진 처리 방식">
        <ul className="notice-list">
          <li>사진은 기기 안에서만 자르고 압축해요. 서버로 보내지 않아요.</li>
          <li>원본 사진은 바꾸지 않고, 항상 새 파일을 만들어요.</li>
          <li>결과 파일에서는 촬영일·위치 같은 EXIF 정보가 지워져요.</li>
          <li>기기에는 내 프리셋·즐겨찾기·최근 작업 요약만 저장해요. 사진은 저장하지 않아요.</li>
          <li>배경 제거·얼굴 보정·AI 합성 기능은 제공하지 않아요.</li>
        </ul>
      </Section>

      <Section id="sources" title="공식 규격 출처">
        <ul className="source-list">
          {officials.map((p) => (
            <li key={p.id}>
              <strong>{p.name}{p.status === 'needs-review' ? ' (확인 중)' : ''}</strong>
              <span>{p.source!.organization} · 확인일 {p.source!.checkedAt}</span>
              <span className="source-url">{p.source!.url}</span>
            </li>
          ))}
        </ul>
        <p className="fineprint">{DISCLAIMER}</p>
      </Section>

      <Section id="oss" title={`오픈소스 라이선스 (${oss.packages.length})`}>
        <ul className="oss-list">
          {oss.packages.map((p) => (
            <li key={`${p.name}@${p.version}`}>
              <strong>{p.name} {p.version}</strong> · {p.license}
              {p.copyright.length ? <small>{p.copyright.join(' / ')}</small> : null}
            </li>
          ))}
        </ul>
      </Section>

      <section className="more-section">
        <button
          type="button"
          className="more-section__head"
          aria-expanded={open === 'diag'}
          onClick={() => {
            const next = open === 'diag' ? null : 'diag';
            setOpen(next);
            if (next) collectDiagnostics().then(setDiag, () => setDiag(null));
          }}
        >
          진단 정보(테스트용)
          <Icon name="chevron-right" size={18} style={{ transform: open === 'diag' ? 'rotate(90deg)' : undefined }} />
        </button>
        {open === 'diag' ? (
          <div className="more-section__body">
            {diag ? (
              <dl className="kv kv--small">
                <div><dt>실행 환경</dt><dd>{diag.runtime === 'toss' ? '토스 앱' : diag.runtime === 'devtools-mock' ? 'devtools 모의 SDK' : '브라우저'}</dd></div>
                {diag.environment ? <div><dt>운영 환경</dt><dd>{diag.environment}</dd></div> : null}
                {diag.deploymentId ? <div><dt>deploymentId</dt><dd className="mono">{diag.deploymentId}</dd></div> : null}
                {diag.tossAppVersion ? <div><dt>토스 앱 버전</dt><dd>{diag.tossAppVersion}</dd></div> : null}
                {diag.platformOS ? <div><dt>OS</dt><dd>{diag.platformOS}</dd></div> : null}
                {diag.albumItemsSupported != null ? <div><dt>getAlbumItems</dt><dd>{diag.albumItemsSupported ? '지원' : '미지원(getPhotos 사용)'}</dd></div> : null}
                {diag.saveBase64Supported != null ? <div><dt>saveBase64</dt><dd>{diag.saveBase64Supported ? '지원' : '미지원'}</dd></div> : null}
                <div><dt>인코딩</dt><dd>JPG {diag.encode.jpeg ? 'O' : 'X'} · PNG {diag.encode.png ? 'O' : 'X'} · WebP {diag.encode.webp ? 'O' : 'X'}</dd></div>
                <div><dt>화면</dt><dd>{diag.viewport} @{diag.dpr}x</dd></div>
              </dl>
            ) : <p className="fineprint">확인 중…</p>}
            <ul className="diag-log">
              {recentEvents().map((e, i) => (
                <li key={i}><span>{e.at}</span> <b>{e.kind}</b> {e.detail}</li>
              ))}
              {recentEvents().length === 0 ? <li>아직 기록이 없어요. 사진을 고르고 변환·저장하면 결과만(사진 내용 제외) 남아요.</li> : null}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="more-section">
        <div className="more-section__head more-section__head--static">
          내 프리셋 초기화
          {confirm ? (
            <span className="inline-actions">
              <button type="button" className="link-btn" onClick={() => setConfirm(false)}>취소</button>
              <button
                type="button"
                className="link-btn danger"
                onClick={() => resetAll().then(() => { setConfirm(false); toast('초기화했어요'); }, () => toast('초기화하지 못했어요'))}
              >
                초기화
              </button>
            </span>
          ) : (
            <button type="button" className="link-btn" onClick={() => setConfirm(true)}>초기화</button>
          )}
        </div>
        {confirm ? <p className="fineprint">내 규격 {customs.length}개, 즐겨찾기, 최근 작업이 지워져요. 되돌릴 수 없어요.</p> : null}
      </section>

      <p className="fineprint fineprint--center">{BRAND.name} {BRAND.version} · 규격 데이터 {CATALOG.checkedAt} 확인</p>
    </Screen>
  );
}
