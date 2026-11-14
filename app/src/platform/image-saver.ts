// 결과 저장 어댑터.
// 토스: File.saveBase64(Android 5.218.0+, iOS 5.216.0+, isSupported 확인). 저장 위치(앨범/파일 앱)는 실기기 확인 전(D-012).
// 브라우저: Blob URL 다운로드. 다운로드는 완료 신호가 없으므로 '다운로드를 시작했어요'로만 안내한다.
import { blobToBase64 } from '@gyushot/image-core/browser';
import { isInToss, sdk } from './toss';

export type SaveResult =
  | { ok: true; via: 'toss-file' | 'browser-download' }
  | { ok: false; reason: 'unsupported' | 'failed'; message?: string };

export async function saveImage(blob: Blob, fileName: string): Promise<SaveResult> {
  if (isInToss()) {
    try {
      const { File } = await sdk();
      if (!File.saveBase64.isSupported()) return { ok: false, reason: 'unsupported' };
      const data = await blobToBase64(blob);
      await File.saveBase64({ data, fileName, mimeType: blob.type });
      return { ok: true, via: 'toss-file' };
    } catch (e) {
      return { ok: false, reason: 'failed', message: e instanceof Error ? e.message : undefined };
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { ok: true, via: 'browser-download' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
