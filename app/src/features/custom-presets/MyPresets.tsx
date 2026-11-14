// 내 프리셋(시안 8번 화면): 즐겨찾기한 공식/일반 규격 + 직접 만든 규격. 공식 원본은 덮어쓰지 않고 복제해서 고친다.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Badge, Header, Screen, useToast } from '../../components/ui';
import { CATALOG_PRESETS, fromCustom, sizeText, specOf, type AppPreset } from '../../data/catalog';
import { thumbFor } from '../../data/samples';
import { useApp } from '../../state/AppState';

export function MyPresets() {
  const navigate = useNavigate();
  const toast = useToast();
  const { favorites, customs, toggleFavorite, deleteCustom } = useApp();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const favPresets = favorites
    .map((k) => CATALOG_PRESETS.find((p) => p.key === k))
    .filter((p): p is AppPreset => p != null && p.enabled);
  const mine = customs.map((c) => fromCustom(c));
  const list = [...favPresets, ...mine];

  const subtitle = (p: AppPreset) => {
    if (p.kind === 'custom' || p.base.dimensions.widthPx != null) {
      const s = specOf(p);
      return `${s.widthPx} × ${s.heightPx}px`;
    }
    return sizeText(p.base);
  };

  return (
    <Screen tabBar className="my">
      <Header title="내 프리셋" back={false} />
      <p className="page-sub page-sub--center">자주 사용하는 규격을 저장해보세요.</p>

      <ul className="my-list">
        {list.map((p) => (
          <li key={p.key} className="my-card">
            <button type="button" className="my-card__main" onClick={() => navigate(`/preset/${encodeURIComponent(p.key)}`)}>
              <img src={thumbFor(p.key)} alt="" className="my-card__thumb" />
              <span className="my-card__text">
                <strong>{p.name}</strong>
                <span>{subtitle(p)}</span>
              </span>
              <Badge label={p.label} />
            </button>
            <button type="button" className="icon-btn my-card__more" aria-label={`${p.name} 관리`} aria-expanded={openKey === p.key} onClick={() => setOpenKey(openKey === p.key ? null : p.key)}>
              <Icon name="more" size={18} />
            </button>
            {openKey === p.key ? (
              <div className="my-card__actions">
                {p.custom ? (
                  <>
                    <button type="button" onClick={() => navigate(`/my/edit/${encodeURIComponent(p.custom!.id)}`)}><Icon name="edit" size={16} /> 수정</button>
                    <button type="button" onClick={() => navigate(`/my/new?from=${encodeURIComponent(p.key)}`)}><Icon name="copy" size={16} /> 복제</button>
                    {confirmDelete === p.key ? (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteCustom(p.custom!.id).then(() => { toast('삭제했어요'); setOpenKey(null); setConfirmDelete(null); }, () => toast('삭제하지 못했어요'))}
                      >
                        <Icon name="trash" size={16} /> 정말 삭제
                      </button>
                    ) : (
                      <button type="button" className="danger" onClick={() => setConfirmDelete(p.key)}><Icon name="trash" size={16} /> 삭제</button>
                    )}
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => navigate(`/my/new?from=${encodeURIComponent(p.key)}`)}><Icon name="copy" size={16} /> 복제해 내 규격 만들기</button>
                    <button type="button" onClick={() => toggleFavorite(p.key).then(() => toast('내 프리셋에서 뺐어요'), () => toast('저장하지 못했어요'))}>
                      <Icon name="heart" size={16} /> 빼기
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {list.length === 0 ? <p className="empty">아직 저장한 규격이 없어요.</p> : null}

      <button type="button" className="add-card" onClick={() => navigate('/my/new')}>
        <Icon name="plus" size={20} /> 새 프리셋 추가하기
      </button>

      <div className="tip">
        <Icon name="bulb" size={22} className="tip__icon" />
        <div>
          <strong>꿀팁!</strong>
          <p>원하는 규격을 한 번만 저장하면,<br />다음부터 더 빠르게 사용할 수 있어요.</p>
        </div>
      </div>
    </Screen>
  );
}
