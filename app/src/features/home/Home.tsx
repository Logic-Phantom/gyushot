// 홈(시안 2번 화면): 로고·카피·시작 카드·자주 쓰는 규격·탭바.
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { BRAND } from '../../brand';
import { HERO_SAMPLE } from '../../data/samples';
import { useApp } from '../../state/AppState';

const QUICK: { key: string; label: string; icon: IconName }[] = [
  { key: 'catalog:passport-online-kr', label: '여권사진', icon: 'plane' },
  { key: 'catalog:id-print-generic', label: '주민등록증', icon: 'idcard' },
  { key: 'catalog:driver-license-online-kr', label: '운전면허증', icon: 'car' },
];

export function Home() {
  const navigate = useNavigate();
  const { recents, storageNotice } = useApp();
  const recentKeys = Array.from(new Map(recents.map((r) => [r.presetKey, r])).values()).slice(0, 3);
  return (
    <Screen tabBar className="home">
      <div className="home__top">
        <span className="home__logo">{BRAND.name}</span>
        <button type="button" className="icon-btn" aria-label="설정" onClick={() => navigate('/more')}>
          <Icon name="gear" size={24} />
        </button>
      </div>
      <h1 className="home__title">
        원하는 규격으로
        <br />
        빠르게 변환해요!
      </h1>
      <p className="home__sub">
        사진 한 장으로,
        <br />
        지금 바로 시작해보세요.
      </p>

      {storageNotice ? <p className="notice notice--warn">{storageNotice}</p> : null}

      <button type="button" className="start-card" onClick={() => navigate('/presets')}>
        <span className="start-card__text">
          <Icon name="sparkle" size={26} className="start-card__sparkle" />
          <strong>제출맞춤 시작하기</strong>
          <span>
            규격 선택하고
            <br />
            자동으로 맞추기
          </span>
          <Icon name="arrow-right" size={22} className="start-card__arrow" />
        </span>
        <span className="tilted-photo tilted-photo--sm" aria-hidden>
          <img src={HERO_SAMPLE.file} alt="" />
        </span>
      </button>

      <div className="section-head">
        <h2>자주 쓰는 규격</h2>
        <button type="button" className="link-btn" onClick={() => navigate('/presets')}>
          전체보기 <Icon name="chevron-right" size={14} />
        </button>
      </div>
      <div className="quick-grid">
        {QUICK.map((q) => (
          <button key={q.key} type="button" className="quick-item" onClick={() => navigate(`/preset/${encodeURIComponent(q.key)}`)}>
            <span className="quick-item__icon"><Icon name={q.icon} size={26} /></span>
            <span>{q.label}</span>
          </button>
        ))}
        <button type="button" className="quick-item" onClick={() => navigate('/presets')}>
          <span className="quick-item__icon quick-item__icon--plain"><Icon name="more" size={26} /></span>
          <span>더보기</span>
        </button>
      </div>

      {recentKeys.length > 0 ? (
        <>
          <div className="section-head"><h2>최근 사용</h2></div>
          <div className="chip-row">
            {recentKeys.map((r) => (
              <button key={r.presetKey} type="button" className="chip" onClick={() => navigate(`/preset/${encodeURIComponent(r.presetKey)}`)}>
                {r.presetName}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <p className="home__privacy">
        <Icon name="shield" size={16} /> 사진은 기기 안에서만 처리하고 서버로 보내지 않아요.
      </p>
    </Screen>
  );
}
