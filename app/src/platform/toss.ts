// 토스 앱 안(WebView)인지 판별하고 SDK를 지연 로드한다(사잇·내차어디 platform/toss.ts와 같은 방식).
// SDK는 토스 밖에서 호출하면 throw하므로 window.ReactNativeWebView 유무로 판별해 브라우저 대체 동작을 쓴다.
// 예외: 개발 서버에서 @apps-in-toss/devtools 모의 SDK가 켜져 있으면(__AIT_MOCK__) SDK 경로를 그대로 탄다(D-022).
// 네이티브 기능은 모두 사용자가 버튼을 눌렀을 때만 호출한다(진입 즉시 권한 요청 금지).

export const APP_NAME = 'gyushot'; // apps-in-toss.config.ts appName과 같게(콘솔 확정 전 제안값)

declare global {
  interface Window {
    ReactNativeWebView?: unknown;
  }
  // vite.config.ts define
  const __AIT_MOCK__: boolean;
}

export type Runtime = 'toss' | 'devtools-mock' | 'browser';

export function runtime(): Runtime {
  if (typeof window !== 'undefined' && window.ReactNativeWebView != null) return 'toss';
  if (typeof __AIT_MOCK__ !== 'undefined' && __AIT_MOCK__) return 'devtools-mock';
  return 'browser';
}

/** SDK 경로를 쓸지(실제 토스 또는 devtools 모의 SDK) */
export function isInToss(): boolean {
  return runtime() !== 'browser';
}

/** 실제 토스 WebView인지(토스 내비게이션 바가 있는지) */
export function isRealToss(): boolean {
  return runtime() === 'toss';
}

export async function sdk() {
  return import('@apps-in-toss/web-framework');
}
