// 사진 선택 어댑터.
// 토스: Device.getAlbumItems(5.261.0+, isSupported 확인) → 없으면 Device.getPhotos. base64로 받아 Blob으로 바꾼다.
//   두 API 모두 maxWidth(기본 1024)로 줄인 이미지를 돌려준다 → 인화 600dpi까지 여유 있게 2400px로 요청(D-011).
// 브라우저: <input type="file">.
import { base64ToBlob } from '@gyushot/image-core/browser';
import { isInToss, sdk } from './toss';

export const ALBUM_MAX_WIDTH = 2400;

export type PickResult =
  | { ok: true; blob: Blob; name: string; via: 'toss-album' | 'file-input' }
  | { ok: false; reason: 'cancelled' | 'denied' | 'unsupported' | 'failed' };

function dataUriToBlob(dataUri: string): Blob {
  const m = /^data:([^;,]+)?(;base64)?,/.exec(dataUri);
  if (m) return base64ToBlob(dataUri.slice(m[0].length), m[1] ?? 'image/jpeg');
  // 순수 base64 문자열(문서 예시: "data:image/jpeg;base64," + dataUri)
  return base64ToBlob(dataUri, 'image/jpeg');
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
  try {
    if (Device.getAlbumItems.isSupported()) {
      const items = await Device.getAlbumItems({ types: ['PHOTO'], maxCount: 1, maxWidth: ALBUM_MAX_WIDTH, base64: true });
      if (items.length === 0) return { ok: false, reason: 'cancelled' };
      return { ok: true, blob: dataUriToBlob(items[0].dataUri), name: `album-${items[0].id}`, via: 'toss-album' };
    }
    const photos = await Device.getPhotos({ maxCount: 1, maxWidth: ALBUM_MAX_WIDTH, base64: true });
    if (photos.length === 0) return { ok: false, reason: 'cancelled' };
    return { ok: true, blob: dataUriToBlob(photos[0].dataUri), name: `album-${photos[0].id}`, via: 'toss-album' };
  } catch (e) {
    if (e instanceof FetchAlbumPhotosPermissionError || isDenied(e)) return { ok: false, reason: 'denied' };
    if ((e as { code?: string })?.code === 'UNSUPPORTED_APP_VERSION') return { ok: false, reason: 'unsupported' };
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
