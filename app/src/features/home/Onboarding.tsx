// 첫 실행 온보딩(시안 1번 화면). 권한 요청·모달 없음. 버튼 또는 화면 탭으로 홈으로 간다.
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../../components/Icon';
import { BRAND } from '../../brand';
import { HERO_SAMPLE } from '../../data/samples';
import { useApp } from '../../state/AppState';

export function Onboarding() {
  const navigate = useNavigate();
  const { finishOnboarding } = useApp();
  const start = () => {
    finishOnboarding();
    navigate('/', { replace: true });
  };
  return (
    <div className="onboarding">
      <div className="onboarding__blob onboarding__blob--a" aria-hidden />
      <div className="onboarding__blob onboarding__blob--b" aria-hidden />
      <div className="onboarding__brand">
        <LogoMark size={108} />
        <p className="onboarding__name">{BRAND.name}</p>
        <p className="onboarding__en">{BRAND.english}</p>
        <p className="onboarding__copy">
          사진 규격,
          <br />
          한 번에 맞추다.
        </p>
      </div>
      <div className="onboarding__photo">
        <div className="tilted-photo tilted-photo--lg">
          <img src={HERO_SAMPLE.file} alt="" />
          <span className="frame-corner frame-corner--tl" />
          <span className="frame-corner frame-corner--tr" />
          <span className="frame-corner frame-corner--bl" />
          <span className="frame-corner frame-corner--br" />
        </div>
      </div>
      <div className="onboarding__bottom">
        <button type="button" className="btn btn--primary btn--block" onClick={start}>
          시작하기
        </button>
        <div className="onboarding__indicator" aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}
