import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ToastProvider } from '../components/ui';
import { CropEditor } from '../features/crop-editor/CropEditor';
import { CustomPresetEditor } from '../features/custom-presets/CustomPresetEditor';
import { MyPresets } from '../features/custom-presets/MyPresets';
import { ExportSettings } from '../features/export-settings/ExportSettings';
import { Home } from '../features/home/Home';
import { Onboarding } from '../features/home/Onboarding';
import { PhotoSelect } from '../features/photo-select/PhotoSelect';
import { PresetList } from '../features/preset-select/PresetList';
import { Recent } from '../features/recent/Recent';
import { Result } from '../features/result/Result';
import { More } from '../features/settings/More';
import { AppStateProvider, useApp } from '../state/AppState';

/** 첫 실행이면 온보딩으로 보낸다(저장소를 읽기 전에는 아무것도 그리지 않음). */
function HomeGate() {
  const { ready, onboarded } = useApp();
  if (!ready) return null;
  return onboarded ? <Home /> : <Navigate to="/welcome" replace />;
}

// 해시 라우팅: 앱인토스는 dist 정적 파일을 그대로 열기 때문에 서버 경로 재작성에 기대지 않는다(사잇과 같은 방식)
const router = createHashRouter([
  { path: '/', element: <HomeGate /> },
  { path: '/welcome', element: <Onboarding /> },
  { path: '/presets', element: <PresetList /> },
  { path: '/preset/:key', element: <PhotoSelect /> },
  { path: '/edit', element: <CropEditor /> },
  { path: '/export', element: <ExportSettings /> },
  { path: '/result', element: <Result /> },
  { path: '/my', element: <MyPresets /> },
  { path: '/my/new', element: <CustomPresetEditor /> },
  { path: '/my/edit/:id', element: <CustomPresetEditor /> },
  { path: '/recent', element: <Recent /> },
  { path: '/more', element: <More /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppStateProvider>
  );
}
