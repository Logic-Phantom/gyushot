// 크롭 영역 계산(순수 함수). 원본 비율을 늘이거나 줄이지 않는다 — 가로·세로에 같은 배율만 쓴다.
import type { CropMode } from './types.ts';

export type Rotation = 0 | 90 | 180 | 270;

export interface Size {
  width: number;
  height: number;
}

/** 편집 상태. center는 회전 적용 후 이미지 기준 0~1 비율 좌표, zoom은 1(꽉 채움) 이상. */
export interface EditState {
  rotation: Rotation;
  zoom: number;
  centerX: number;
  centerY: number;
}

export const INITIAL_EDIT: EditState = { rotation: 0, zoom: 1, centerX: 0.5, centerY: 0.5 };
export const MAX_ZOOM = 4;

export interface CropPlan {
  /** 회전 적용 후 이미지 좌표의 원본 영역 */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** 출력 캔버스 좌표의 그릴 영역(cover면 출력 전체) */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /** 출력 1px당 원본 픽셀 수의 역수(>1이면 확대 → 흐려질 수 있음) */
  scale: number;
  /** contain에서 여백이 생기는지 */
  hasPadding: boolean;
}

export function rotateSize(size: Size, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270 ? { width: size.height, height: size.width } : size;
}

export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** cover 모드에서 zoom=1일 때 목표 비율로 잘라낼 수 있는 가장 큰 영역 크기 */
export function baseCoverSize(image: Size, aspect: number): Size {
  if (image.width / image.height > aspect) return { width: image.height * aspect, height: image.height };
  return { width: image.width, height: image.width / aspect };
}

/** 중심 좌표를 영역이 이미지 밖으로 나가지 않게 보정한다. */
export function clampCenter(image: Size, crop: Size, centerX: number, centerY: number): { centerX: number; centerY: number } {
  const halfW = crop.width / 2 / image.width;
  const halfH = crop.height / 2 / image.height;
  return {
    centerX: halfW >= 0.5 ? 0.5 : clamp(centerX, halfW, 1 - halfW),
    centerY: halfH >= 0.5 ? 0.5 : clamp(centerY, halfH, 1 - halfH),
  };
}

/**
 * 크롭 계획. image는 원본(EXIF 방향 반영 후) 크기, rotation은 사용자가 추가로 돌린 각도.
 * - cover: 목표 비율 영역을 zoom만큼 줄여 중심 주변을 잘라 출력 전체를 채운다.
 * - contain: 이미지 전체를 출력 안에 넣고 남는 부분은 여백(배경색)으로 둔다. zoom·center는 쓰지 않는다.
 */
export function planCrop(image: Size, output: Size, mode: CropMode, edit: EditState): CropPlan {
  const rotated = rotateSize(image, edit.rotation);
  const aspect = output.width / output.height;
  if (mode === 'contain') {
    const k = Math.min(output.width / rotated.width, output.height / rotated.height);
    const dw = rotated.width * k;
    const dh = rotated.height * k;
    const dx = (output.width - dw) / 2;
    const dy = (output.height - dh) / 2;
    return {
      sx: 0, sy: 0, sw: rotated.width, sh: rotated.height,
      dx, dy, dw, dh,
      scale: k,
      hasPadding: Math.round(dw) < output.width || Math.round(dh) < output.height,
    };
  }
  const zoom = clamp(edit.zoom, 1, MAX_ZOOM);
  const base = baseCoverSize(rotated, aspect);
  const crop = { width: base.width / zoom, height: base.height / zoom };
  const c = clampCenter(rotated, crop, edit.centerX, edit.centerY);
  const sx = c.centerX * rotated.width - crop.width / 2;
  const sy = c.centerY * rotated.height - crop.height / 2;
  return {
    sx, sy, sw: crop.width, sh: crop.height,
    dx: 0, dy: 0, dw: output.width, dh: output.height,
    scale: output.width / crop.width,
    hasPadding: false,
  };
}

/**
 * 원본(회전 전) 좌표 → 출력 좌표 아핀 행렬 [a, b, c, d, e, f] (canvas setTransform 순서).
 * x' = a·x + c·y + e, y' = b·x + d·y + f
 */
export function planToMatrix(image: Size, rotation: Rotation, plan: CropPlan): [number, number, number, number, number, number] {
  const W = image.width;
  const H = image.height;
  // 원본 → 회전 좌표(시계 방향)
  let r: [number, number, number, number, number, number];
  switch (rotation) {
    case 90: r = [0, 1, -1, 0, H, 0]; break;
    case 180: r = [-1, 0, 0, -1, W, H]; break;
    case 270: r = [0, -1, 1, 0, 0, W]; break;
    default: r = [1, 0, 0, 1, 0, 0];
  }
  const kx = plan.dw / plan.sw;
  const ky = plan.dh / plan.sh;
  const [a, b, c, d, e, f] = r;
  return [kx * a, ky * b, kx * c, ky * d, kx * (e - plan.sx) + plan.dx, ky * (f - plan.sy) + plan.dy];
}

export function applyMatrix(m: readonly number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** 확대 시 해상도 부족 경고 기준: 출력 1px에 원본 1px 미만이 쓰이면(scale>1) 흐려질 수 있다. */
export function isUpscaled(plan: CropPlan): boolean {
  return plan.scale > 1.001;
}

/**
 * 미리보기 드래그: 화면 픽셀 이동량(dxView, dyView)을 중심 좌표 변화로 바꾼다.
 * viewCropWidth는 화면에서 크롭 프레임의 폭(px).
 */
export function panBy(image: Size, output: Size, edit: EditState, dxView: number, dyView: number, viewCropWidth: number): EditState {
  const rotated = rotateSize(image, edit.rotation);
  const base = baseCoverSize(rotated, output.width / output.height);
  const cropW = base.width / edit.zoom;
  const cropH = base.height / edit.zoom;
  const imgPxPerViewPx = cropW / viewCropWidth;
  const next = clampCenter(
    rotated,
    { width: cropW, height: cropH },
    edit.centerX - (dxView * imgPxPerViewPx) / rotated.width,
    edit.centerY - (dyView * imgPxPerViewPx) / rotated.height,
  );
  return { ...edit, ...next };
}

export function zoomTo(image: Size, output: Size, edit: EditState, zoom: number): EditState {
  const z = clamp(zoom, 1, MAX_ZOOM);
  const rotated = rotateSize(image, edit.rotation);
  const base = baseCoverSize(rotated, output.width / output.height);
  const c = clampCenter(rotated, { width: base.width / z, height: base.height / z }, edit.centerX, edit.centerY);
  return { ...edit, zoom: z, ...c };
}
