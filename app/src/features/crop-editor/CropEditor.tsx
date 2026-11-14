// 사진 편집(시안 4번 화면): 크롭 프레임 + 비율 칩 + 회전·확대·이동·초기화 + 다음 단계.
// 배경 제거·얼굴 보정·AI 기능은 두지 않는다(원칙 6).
import { INITIAL_EDIT, isUpscaled, nextRotation, planCrop, zoomTo, type CropMode } from '@gyushot/image-core';
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { Button, Header, Screen, Segmented, useToast } from '../../components/ui';
import { ratioChipLabel, specOf } from '../../data/catalog';
import { defaultSettings, useApp } from '../../state/AppState';
import { CropStage } from './CropStage';

const OTHER_RATIOS = ['1:1', '4:5', '16:9'];

export function CropEditor() {
  const navigate = useNavigate();
  const toast = useToast();
  const { session, preset, setEdit, setSettings, ensureSettings } = useApp();

  useEffect(() => {
    if (!session.settings) ensureSettings();
  }, [session.settings, ensureSettings]);

  if (!preset) return <Navigate to="/presets" replace />;
  if (!session.source) return <Navigate to={`/preset/${encodeURIComponent(preset.key)}`} replace />;

  const spec = specOf(preset, session.settings?.dpi);
  const settings = session.settings ?? defaultSettings(preset);
  const output = { width: spec.widthPx, height: spec.heightPx };
  const { decoded } = session.source;
  const edit = session.edit;
  const plan = planCrop(decoded.size, output, settings.cropMode, edit);
  const lowRes = isUpscaled(plan);
  const fixedMode = preset.label === '공식';
  const presetChip = ratioChipLabel(preset);

  const tools: { icon: IconName; label: string; onClick: () => void; disabled?: boolean }[] = [
    { icon: 'rotate', label: '회전', onClick: () => setEdit((e) => ({ ...e, rotation: nextRotation(e.rotation), centerX: 0.5, centerY: 0.5, zoom: 1 })) },
    {
      icon: 'zoom-in',
      label: '확대',
      disabled: settings.cropMode !== 'cover',
      onClick: () => setEdit((e) => zoomTo(decoded.size, output, e, e.zoom >= 2.9 ? 1 : e.zoom * 1.25)),
    },
    { icon: 'move', label: '가운데', disabled: settings.cropMode !== 'cover', onClick: () => setEdit((e) => ({ ...e, centerX: 0.5, centerY: 0.5 })) },
    { icon: 'reset', label: '초기화', onClick: () => setEdit({ ...INITIAL_EDIT }) },
  ];

  return (
    <Screen className="editor">
      <Header
        title="사진 편집"
        right={
          <button type="button" className="icon-btn" aria-label="사진 다시 선택" onClick={() => navigate(`/preset/${encodeURIComponent(preset.key)}`)}>
            <Icon name="album" size={22} />
          </button>
        }
      />
      <CropStage
        bitmap={decoded.bitmap}
        imageSize={decoded.size}
        output={output}
        mode={settings.cropMode}
        edit={edit}
        background={settings.background}
        onChange={setEdit}
      />

      <div className="editor__info">
        <span>{spec.widthPx} × {spec.heightPx}px</span>
        <span>원본 {decoded.size.width} × {decoded.size.height}px</span>
        <span>{Math.round(edit.zoom * 100)}%</span>
      </div>
      {lowRes ? (
        <p className="notice notice--warn">
          <Icon name="alert" size={16} /> 원본 해상도가 낮아 확대되는 부분이 흐려질 수 있어요.
        </p>
      ) : null}

      <div className="ratio-chips" role="radiogroup" aria-label="비율">
        <button type="button" role="radio" aria-checked className="ratio-chip is-active">{presetChip}</button>
        {OTHER_RATIOS.filter((r) => r !== presetChip).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={false}
            aria-disabled
            className="ratio-chip is-locked"
            onClick={() => toast('선택한 규격의 비율로 고정돼 있어요. 다른 비율은 직접 설정에서 만들 수 있어요.')}
          >
            {r}
          </button>
        ))}
      </div>

      {!fixedMode ? (
        <Segmented<CropMode>
          ariaLabel="맞추는 방식"
          value={settings.cropMode}
          onChange={(v) => setSettings({ ...settings, cropMode: v })}
          options={[
            { value: 'cover', label: '꽉 채우기(잘라내기)' },
            { value: 'contain', label: '전체 보기(여백)' },
          ]}
        />
      ) : null}
      {settings.cropMode === 'contain' ? <p className="fineprint">사진 전체를 넣고 남는 부분은 여백으로 채워요.</p> : null}

      <div className="tool-row">
        {tools.map((t) => (
          <button key={t.label} type="button" className="tool" onClick={t.onClick} disabled={t.disabled}>
            <span className="tool__icon"><Icon name={t.icon} size={22} /></span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bottom-bar">
        <Button onClick={() => navigate('/export')}>
          다음 단계 <Icon name="arrow-right" size={20} />
        </Button>
      </div>
    </Screen>
  );
}
