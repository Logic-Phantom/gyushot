// 사진 선택 어댑터.
// 토스: Device.getAlbumItems(5.261.0+, isSupported 확인) → 없으면 Device.getPhotos. base64로 받아 Blob으로 바꾼다.
//   두 API 모두 maxWidth(기본 1024)로 줄인 이미지를 돌려준다 → 인화 600dpi까지 여유 있게 2400px로 요청(D-011).
// 브라우저: <input type="file">.
import { mimeOfFormat, sniffFormat } from '@gyushot/image-core';
import { base64ToBlob } from '@gyushot/image-core/browser';
import { logEvent } from './diagnostics';
import { isInToss, sdk } from './toss';

export const ALBUM_MAX_WIDTH = 2400;

export type PickResult =
  | { ok: true; blob: Blob; name: string; via: 'toss-album' | 'file-input' }
  | { ok: false; reason: 'cancelled' | 'denied' | 'unsupported' | 'failed' };

function dataUriToBlob(dataUri: string): Blob {
  const m = /^data:([^;,]+)?(;base64)?,/.exec(dataUri);
  if (m) return base64ToBlob(dataUri.slice(m[0].length), m[1] ?? 'image/jpeg');
  // 순수 base64 문자열: 접두가 없어 형식을 알 수 없다 → 앞부분 바이트로 판별(devtools 모의 SDK는 PNG를 돌려줌)
  const head = atob(dataUri.slice(0, 24));
  const mime = mimeOfFormat(sniffFormat(Uint8Array.from(head, (c) => c.charCodeAt(0))));
  return base64ToBlob(dataUri, mime === 'application/octet-stream' ? 'image/jpeg' : mime);
}

const isDenied = (e: unknown) => {
  const code = (e as { code?: string })?.code;
  return code === 'NOT_ALLOWED' || code === 'PERMISSION_DENIED';
};

async function pickFromToss(): Promise<PickResult> {
  let mod: Awaited<ReturnType<typeof sdk>>;
  try {
    mod = await sdk();
  } catch {
    return { ok: false, reason: 'failed' };
  }
  const { Device, FetchAlbumPhotosPermissionError } = mod;
  const useItems = Device.getAlbumItems.isSupported();
  const api = useItems ? 'getAlbumItems' : 'getPhotos';
  try {
    const list = useItems
      ? await Device.getAlbumItems({ types: ['PHOTO'], maxCount: 1, maxWidth: ALBUM_MAX_WIDTH, base64: true })
      : await Device.getPhotos({ maxCount: 1, maxWidth: ALBUM_MAX_WIDTH, base64: true });
    if (list.length === 0) {
      logEvent('pick', `${api}: 취소(빈 배열)`);
      return { ok: false, reason: 'cancelled' };
    }
    const uri = list[0].dataUri;
    const blob = dataUriToBlob(uri);
    // 반환 형식 확인용: data URI 접두 여부·MIME·크기만 기록(내용은 기록하지 않음)
    logEvent('pick', `${api}: ${uri.startsWith('data:') ? uri.slice(0, uri.indexOf(',')) : 'base64(접두 없음)'} · ${blob.size} bytes`);
    return { ok: true, blob, name: `album-${list[0].id}`, via: 'toss-album' };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    logEvent('pick', `${api}: 오류 ${code ?? (e instanceof Error ? e.name : 'unknown')}`);
    if (e instanceof FetchAlbumPhotosPermissionError || isDenied(e)) return { ok: false, reason: 'denied' };
    if (code === 'UNSUPPORTED_APP_VERSION') return { ok: false, reason: 'unsupported' };
    return { ok: false, reason: 'failed' };
  }
}

function pickFromFileInput(): Promise<PickResult> {
  return new Promise((done) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
    let settled = false;
    const finish = (r: PickResult) => {
      if (settled) return;
      settled = true;
      done(r);
    };
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return finish({ ok: false, reason: 'cancelled' });
      finish({ ok: true, blob: file, name: file.name, via: 'file-input' });
    };
    input.addEventListener('cancel', () => finish({ ok: false, reason: 'cancelled' }));
    input.click();
  });
}

/** 사용자가 '사진 선택'을 눌렀을 때만 호출한다. */
export function pickImage(): Promise<PickResult> {
  return isInToss() ? pickFromToss() : pickFromFileInput();
}
