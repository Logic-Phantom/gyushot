// 최근 작업: 어떤 규격으로 만들었는지 요약만 보관한다(사진·파일명 저장 없음).
import { formatBytes } from '@gyushot/image-core';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Header, Screen, useToast } from '../../components/ui';
import { useApp } from '../../state/AppState';

function ago(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export function Recent() {
  const navigate = useNavigate();
  const toast = useToast();
  const { recents, clearRecents } = useApp();
  return (
    <Screen tabBar className="recent">
      <Header
        title="최근 작업"
        back={false}
        right={recents.length ? <button type="button" className="link-btn" onClick={() => clearRecents().then(() => toast('기록을 지웠어요'))}>전체 삭제</button> : null}
      />
      <p className="page-sub page-sub--center">사진은 저장하지 않고, 어떤 규격으로 만들었는지만 기억해요.</p>
      {recents.length === 0 ? (
        <div className="empty-state">
          <Icon name="clock" size={36} />
          <p>아직 변환한 사진이 없어요.</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/presets')}>규격 고르기</button>
        </div>
      ) : (
        <ul className="recent-list">
          {recents.map((r) => (
            <li key={r.at}>
              <button type="button" className="recent-row" onClick={() => navigate(`/preset/${encodeURIComponent(r.presetKey)}`)}>
                <span>
                  <strong>{r.presetName}</strong>
                  <small>{r.width} × {r.height}px · {formatBytes(r.bytes)} · {r.format}</small>
                </span>
                <span className="recent-row__time">{ago(r.at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
