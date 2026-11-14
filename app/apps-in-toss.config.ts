import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔 등록명과 같아야 업로드된다. 'gyushot'은 저장소 이름 기준 제안값 — 콘솔에서 확정 후 src/platform/toss.ts APP_NAME도 같이 바꾼다.
  appName: 'gyushot',
  brand: {
    // 제출맞춤 라임(브랜드 강조색 1개)
    primaryColor: '#8BD13B',
  },
  // photos:read — '앨범에서 사진 선택'을 누를 때만 Device.getAlbumItems/getPhotos 호출.
  // File.saveBase64는 문서에 필요한 권한이 명시돼 있지 않아 쓰기 권한을 선언하지 않는다(D-012, 샌드박스 확인 필요).
  permissions: [{ name: 'photos', access: 'read' }],
  // 토스 내비게이션 바의 뒤로가기를 쓰고, 토스 안에서는 앱 자체 뒤로가기 버튼을 그리지 않는다(두 뒤로가기 동시 노출 금지)
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
  },
  webBundleDir: 'dist',
});
