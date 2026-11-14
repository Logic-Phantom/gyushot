// QR 테스트·devtools 점검용 진단 정보. 사진·파일 내용·base64는 절대 남기지 않는다(크기·형식·결과 코드만).
// console에도 '[제출맞춤]' 접두로 남겨 토스 앱 '웹 디버그 툴즈' Log 탭에서 볼 수 있게 한다.
import { canEncode } from '@gyushot/image-core/browser';
import { runtime, sdk, type Runtime } from './toss';

export interface DiagEvent {
  at: string;
  kind: 'pick' | 'decode' | 'convert' | 'save' | 'storage' | 'error';
  detail: string;
}

const MAX = 40;
const events: DiagEvent[] = [];

export function logEvent(kind: DiagEvent['kind'], detail: string): void {
  const e = { at: new Date().toISOString().slice(11, 19), kind, detail };
  events.unshift(e);
  if (events.length > MAX) events.pop();
  console.info(`[제출맞춤] ${kind}: ${detail}`);
}

export function recentEvents(): DiagEvent[] {
  return [...events];
}

export interface DiagInfo {
  runtime: Runtime;
  environment?: string;
  deploymentId?: string;
  tossAppVersion?: string;
  platformOS?: string;
  albumItemsSupported?: boolean;
  saveBase64Supported?: boolean;
  encode: { jpeg: boolean; png: boolean; webp: boolean };
  viewport: string;
  dpr: number;
  userAgent: string;
}

export async function collectDiagnostics(): Promise<DiagInfo> {
  const [jpeg, png, webp] = await Promise.all([canEncode('image/jpeg'), canEncode('image/png'), canEncode('image/webp')]);
  const info: DiagInfo = {
    runtime: runtime(),
    encode: { jpeg, png, webp },
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    userAgent: navigator.userAgent,
  };
  if (info.runtime === 'browser') return info;
  try {
    const m = await sdk();
    const safe = <T,>(f: () => T): T | undefined => {
      try {
        return f();
      } catch {
        return undefined;
      }
    };
    info.environment = safe(() => m.Environment.environment);
    info.deploymentId = safe(() => m.Environment.deploymentId);
    info.tossAppVersion = safe(() => m.Environment.tossAppVersion);
    info.platformOS = safe(() => m.getPlatformOS());
    info.albumItemsSupported = safe(() => m.Device.getAlbumItems.isSupported());
    info.saveBase64Supported = safe(() => m.File.saveBase64.isSupported());
  } catch (e) {
    logEvent('error', `SDK 로드 실패: ${e instanceof Error ? e.message : String(e)}`);
  }
  return info;
}
