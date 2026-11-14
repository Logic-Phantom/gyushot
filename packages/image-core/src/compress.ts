// 용량 상한 이하 품질 탐색(순수 로직, 인코더는 주입).
// 상한은 "이하"로 정의한다. 용량을 맞추려고 픽셀을 줄이지 않는다(프리셋 규칙 4-2).

export interface EncodeAttempt<T> {
  quality: number;
  bytes: number;
  value: T;
}

export interface QualitySearchOptions {
  /** 사용자가 고른 품질(0~1). 이 값으로 상한을 만족하면 그대로 쓴다(더 올리지 않음). */
  startQuality: number;
  /** 이 품질보다 낮게는 내려가지 않는다. */
  minQuality: number;
  maxBytes?: number;
  /** 인코딩 최대 시도 횟수 */
  maxAttempts: number;
  /** 제한 시간(ms). 넘으면 지금까지의 최선 결과로 끝낸다. */
  timeLimitMs?: number;
  now?: () => number;
}

export type QualitySearchResult<T> =
  | { ok: true; best: EncodeAttempt<T>; attempts: EncodeAttempt<number>[] }
  | { ok: false; reason: 'too-large' | 'timeout'; smallest: EncodeAttempt<T>; attempts: EncodeAttempt<number>[] };

export const DEFAULT_MIN_QUALITY = 0.4;
export const DEFAULT_MAX_ATTEMPTS = 8;

/**
 * 이분 탐색으로 상한 이하인 가장 높은 품질을 찾는다.
 * encode는 최종 파일(메타데이터 패치 포함)의 실제 바이트 수를 돌려줘야 한다.
 */
export async function searchQuality<T>(
  encode: (quality: number) => Promise<{ bytes: number; value: T }>,
  options: QualitySearchOptions,
): Promise<QualitySearchResult<T>> {
  const now = options.now ?? (() => Date.now());
  const started = now();
  const attempts: EncodeAttempt<number>[] = [];
  const run = async (q: number): Promise<EncodeAttempt<T>> => {
    const quality = Math.round(q * 1000) / 1000;
    const r = await encode(quality);
    attempts.push({ quality, bytes: r.bytes, value: r.bytes });
    return { quality, bytes: r.bytes, value: r.value };
  };

  const first = await run(options.startQuality);
  if (options.maxBytes == null || first.bytes <= options.maxBytes) return { ok: true, best: first, attempts };

  let smallest = first;
  const floor = await run(options.minQuality);
  if (floor.bytes < smallest.bytes) smallest = floor;
  if (floor.bytes > options.maxBytes) return { ok: false, reason: 'too-large', smallest, attempts };

  let best = floor;
  let lo = options.minQuality;
  let hi = options.startQuality;
  while (attempts.length < options.maxAttempts && hi - lo > 0.02) {
    if (options.timeLimitMs != null && now() - started > options.timeLimitMs) break;
    const mid = (lo + hi) / 2;
    const r = await run(mid);
    if (r.bytes <= options.maxBytes) {
      best = r;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { ok: true, best, attempts };
}
