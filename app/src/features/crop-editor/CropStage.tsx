// 크롭 미리보기 스테이지: 캔버스에 사진을 그리고 규격 비율 프레임을 겹친다.
// 드래그(한 손가락)로 이동, 핀치(두 손가락)·휠로 확대. touch-action:none으로 WebView 스크롤·제스처와 충돌을 막는다.
import { panBy, planCrop, planToMatrix, zoomTo, type CropMode, type EditState, type Size } from '@gyushot/image-core';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const PREVIEW_MAX_SIDE = 1600;
const PAD = 22;

interface Props {
  bitmap: ImageBitmap;
  imageSize: Size;
  output: Size;
  mode: CropMode;
  edit: EditState;
  background: string;
  onChange: (e: EditState) => void;
}

/** 큰 원본은 미리보기용으로 한 번만 줄여 둔다. 반환 f = 미리보기/원본 배율 */
function usePreviewSource(bitmap: ImageBitmap) {
  const [src, setSrc] = useState<{ image: CanvasImageSource; f: number } | null>(null);
  useEffect(() => {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= PREVIEW_MAX_SIDE) {
      setSrc({ image: bitmap, f: 1 });
      return;
    }
    const f = PREVIEW_MAX_SIDE / longest;
    const c = document.createElement('canvas');
    c.width = Math.round(bitmap.width * f);
    c.height = Math.round(bitmap.height * f);
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    setSrc({ image: c, f: c.width / bitmap.width });
    return () => {
      c.width = 0;
      c.height = 0;
    };
  }, [bitmap]);
  return src;
}

export function CropStage({ bitmap, imageSize, output, mode, edit, background, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const preview = usePreviewSource(bitmap);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    setBox({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // 프레임: 스테이지 안에 규격 비율로 최대한 크게
  const aspect = output.width / output.height;
  const availW = Math.max(1, box.width - PAD * 2);
  const availH = Math.max(1, box.height - PAD * 2);
  const frameW = availW / availH > aspect ? availH * aspect : availW;
  const frameH = frameW / aspect;
  const frame = { x: (box.width - frameW) / 2, y: (box.height - frameH) / 2, w: frameW, h: frameH };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview || box.width === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const plan = planCrop(imageSize, output, mode, edit);
    const m = planToMatrix(imageSize, edit.rotation, plan);
    const S = frame.w / output.width;
    if (mode === 'contain') {
      ctx.fillStyle = background;
      ctx.fillRect(frame.x * dpr, frame.y * dpr, frame.w * dpr, frame.h * dpr);
    }
    const k = (S * dpr) / preview.f;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(m[0] * k, m[1] * k, m[2] * k, m[3] * k, (S * m[4] + frame.x) * dpr, (S * m[5] + frame.y) * dpr);
    ctx.drawImage(preview.image, 0, 0);
  }, [preview, box, imageSize, output, mode, edit, background, frame.x, frame.y, frame.w]);

  // ── 제스처 ──
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const editRef = useRef(edit);
  editRef.current = edit;

  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== 'cover') return;
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: editRef.current.zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      onChange(zoomTo(imageSize, output, editRef.current, pinch.current.zoom * (dist / pinch.current.dist)));
    } else if (pointers.current.size === 1) {
      onChange(panBy(imageSize, output, editRef.current, cur.x - prev.x, cur.y - prev.y, frame.w));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (mode !== 'cover') return;
    onChange(zoomTo(imageSize, output, editRef.current, editRef.current.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== 'cover') return;
    const step = 8;
    const d: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    onChange(panBy(imageSize, output, editRef.current, v[0], v[1], frame.w));
  };

  return (
    <div
      ref={wrapRef}
      className={`crop-stage${mode === 'cover' ? ' is-draggable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="application"
      aria-label="크롭 영역 조정. 드래그로 위치를 옮기고 두 손가락으로 확대해요. 키보드 화살표로도 옮길 수 있어요."
    >
      <canvas ref={canvasRef} className="crop-stage__canvas" style={{ width: box.width, height: box.height }} />
      {box.width > 0 ? (
        <div className="crop-frame" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}>
          <span className="crop-frame__grid crop-frame__grid--v1" />
          <span className="crop-frame__grid crop-frame__grid--v2" />
          <span className="crop-frame__grid crop-frame__grid--h1" />
          <span className="crop-frame__grid crop-frame__grid--h2" />
          <span className="crop-frame__corner crop-frame__corner--tl" />
          <span className="crop-frame__corner crop-frame__corner--tr" />
          <span className="crop-frame__corner crop-frame__corner--bl" />
          <span className="crop-frame__corner crop-frame__corner--br" />
        </div>
      ) : null}
    </div>
  );
}
