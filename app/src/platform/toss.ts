// 토스 앱 안(WebView)인지 판별하고 SDK를 지연 로드한다(사잇·내차어디 platform/toss.ts와 같은 방식).
// SDK는 토스 밖에서 호출하면 throw하므로 window.ReactNativeWebView 유무로 판별해 브라우저 대체 동작을 쓴다.
// 네이티브 기능은 모두 사용자가 버튼을 눌렀을 때만 호출한다(진입 즉시 권한 요청 금지).

export const APP_NAME = 'gyushot'; // apps-in-toss.config.ts appName과 같게(콘솔 확정 전 제안값)

declare global {
  interface Window {
    ReactNativeWebView?: unknown;
  }
}

export function isInToss(): boolean {
  return typeof window !== 'undefined' && window.ReactNativeWebView != null;
}

export async function sdk() {
  return import('@apps-in-toss/web-framework');
}
