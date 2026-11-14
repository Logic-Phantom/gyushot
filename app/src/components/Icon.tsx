// 자체 제작 라인 아이콘(24 그리드, 2px 스트로크). 디자인 시안(assets/design/ui-mockup.webp)의 아이콘 모양을 따라 그렸다.
// 공식 기관 로고·휘장은 쓰지 않는다.
import type { CSSProperties, ReactElement } from 'react';

export type IconName =
  | 'chevron-left' | 'chevron-right' | 'gear' | 'globe' | 'idcard' | 'car' | 'star' | 'image' | 'doc' | 'more'
  | 'home' | 'heart' | 'clock' | 'menu' | 'sliders' | 'rotate' | 'zoom-in' | 'move' | 'reset' | 'arrow-right'
  | 'download' | 'check' | 'sparkle' | 'plus' | 'bulb' | 'info' | 'plane' | 'bolt' | 'album' | 'trash' | 'copy'
  | 'edit' | 'shield' | 'x' | 'alert' | 'search';

const P: Record<IconName, ReactElement> = {
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  'chevron-right': <path d="M9 5l7 7-7 7" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  idcard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14.5 10H18M14.5 13.5H18" />
    </>
  ),
  car: (
    <>
      <path d="M5 16v2.5M19 16v2.5M3.5 12.5l1.8-5A2 2 0 0 1 7.2 6h9.6a2 2 0 0 1 1.9 1.5l1.8 5" />
      <rect x="3" y="12" width="18" height="5" rx="2" />
      <path d="M7 14.5h.01M17 14.5h.01" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.8" />
      <path d="M21 16l-5-5-8 9" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18.5" cy="12" r="1.2" />
    </>
  ),
  home: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  heart: <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sliders: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4.5v5M6 14.5v5" />,
  rotate: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
  'zoom-in': (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4M11 8v6M8 11h6" />
    </>
  ),
  move: <path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />,
  reset: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5" />
      <path d="M20 4v4.5h-4.5M4 20v-4.5h4.5" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  bulb: (
    <>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  plane: <path d="M21 4L3 11l6.5 2.5L12 20l3-6.5L21 4zM9.5 13.5L15 9" />,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  album: (
    <>
      <rect x="3" y="5" width="15" height="15" rx="2.5" />
      <path d="M7 3h12a2 2 0 0 1 2 2v12M3 16l4-4 3.5 3.5L13 13l5 5" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  shield: <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6zM9 12l2 2 4-4" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 10v4.5M12 17.5h.01" />
    </>
  ),
};

const FILLED = new Set<IconName>(['star', 'sparkle', 'bolt', 'more']);

export function Icon({ name, size = 22, strokeWidth = 2, filled, style, className, title }: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
  style?: CSSProperties;
  className?: string;
  title?: string;
}) {
  const fill = filled ?? FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={fill ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={style}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {P[name]}
    </svg>
  );
}

/** 로고 마크: 라임 프레임 모서리 + 카메라 */
export function LogoMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <g stroke="var(--color-lime)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 34V18a8 8 0 0 1 8-8h16" />
        <path d="M86 10h16a8 8 0 0 1 8 8v16" />
        <path d="M110 86v16a8 8 0 0 1-8 8H86" />
        <path d="M34 110H18a8 8 0 0 1-8-8V86" />
      </g>
      <path d="M30 44a8 8 0 0 1 8-8h9l5-7h16l5 7h9a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8z" fill="var(--color-ink)" />
      <circle cx="60" cy="61" r="15" fill="#fff" />
      <circle cx="60" cy="61" r="9" fill="var(--color-ink)" />
    </svg>
  );
}
