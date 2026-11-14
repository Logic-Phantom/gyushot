// 규격 선택(시안 3번 화면): 탭(공식 규격/일반 사진/온라인 제출) + 목록 + 직접 설정하기.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Badge, Button, Header, IconTile, Screen, Segmented } from '../../components/ui';
import { CATALOG_PRESETS, presetSubtitle, type AppPreset } from '../../data/catalog';

type Tab = 'official' | 'general' | 'online';

const FILTERS: Record<Tab, (p: AppPreset) => boolean> = {
  official: (p) => p.kind === 'official-print' || p.kind === 'official-online',
  general: (p) => p.kind === 'common-print',
  online: (p) => p.kind === 'official-online',
};

export function PresetList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'official';
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const q = query.trim();
  const list = q
    ? CATALOG_PRESETS.filter((p) => `${p.name} ${p.shortDescription}`.includes(q))
    : CATALOG_PRESETS.filter(FILTERS[tab]);

  return (
    <Screen className="presets">
      <Header
        right={
          <button type="button" className="icon-btn" aria-label="규격 검색" aria-pressed={searching} onClick={() => setSearching((v) => !v)}>
            <Icon name="search" size={22} />
          </button>
        }
      />
      <h1 className="page-title">
        어떤 사진을
        <br />
        만들까요?
      </h1>
      <p className="page-sub">용도에 맞는 규격을 선택하세요.</p>

      {searching ? (
        <input
          className="input search-input"
          type="search"
          placeholder="여권, 면허증, 반명함…"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          aria-label="규격 이름 검색"
        />
      ) : null}

      {!q ? (
        <Segmented<Tab>
          ariaLabel="규격 종류"
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={[
            { value: 'official', label: '공식 규격' },
            { value: 'general', label: '일반 사진' },
            { value: 'online', label: '온라인 제출' },
          ]}
        />
      ) : null}

      <ul className="preset-list">
        {list.map((p) => (
          <li key={p.key}>
            <button
              type="button"
              className="preset-row"
              disabled={!p.enabled}
              onClick={() => navigate(`/preset/${encodeURIComponent(p.key)}`)}
            >
              <IconTile icon={p.icon} />
              <span className="preset-row__text">
                <span className="preset-row__name">
                  {p.name} <Badge label={p.enabled ? p.label : '준비 중'} />
                </span>
                <span className="preset-row__sub">{presetSubtitle(p)}</span>
              </span>
              <Icon name="chevron-right" size={20} className="preset-row__chev" />
            </button>
          </li>
        ))}
        {list.length === 0 ? <li className="empty">찾는 규격이 없어요. 직접 설정해 보세요.</li> : null}
      </ul>

      <p className="fineprint">
        <b>공식</b>은 기관 안내에서 확인한 규격, <b>일반</b>은 널리 쓰이는 인화 크기예요.
      </p>

      <div className="bottom-bar">
        <Button variant="lime-outline" onClick={() => navigate('/my/new?use=1')}>
          <Icon name="sliders" size={20} /> 직접 설정하기
        </Button>
      </div>
    </Screen>
  );
}
