// 공통 UI 조각. 색·간격은 styles/tokens.css 변수만 쓴다.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ICON_TONE, type PresetLabel } from '../data/catalog';
import { isInToss } from '../platform/toss';
import { Icon, type IconName } from './Icon';

/** 화면 상단. 토스 안에서는 토스 내비게이션 바가 뒤로가기를 그리므로 앱 자체 뒤로가기를 숨긴다. */
export function Header({ title, back = true, right, onBack, large }: {
  title?: ReactNode;
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
  large?: boolean;
}) {
  const navigate = useNavigate();
  const showBack = back && !isInToss();
  return (
    <header className={`header${large ? ' header--large' : ''}`}>
      <div className="header__side">
        {showBack ? (
          <button type="button" className="icon-btn" aria-label="뒤로" onClick={onBack ?? (() => navigate(-1))}>
            <Icon name="chevron-left" size={24} />
          </button>
        ) : null}
      </div>
      {title != null ? <h1 className="header__title">{title}</h1> : <span />}
      <div className="header__side header__side--right">{right}</div>
    </header>
  );
}

export function Screen({ children, tabBar, className }: { children: ReactNode; tabBar?: boolean; className?: string }) {
  return (
    <div className={`screen${tabBar ? ' screen--tabbar' : ''}${className ? ` ${className}` : ''}`}>
      {children}
      {tabBar ? <TabBar /> : null}
    </div>
  );
}

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/my', label: '내 프리셋', icon: 'heart' },
  { to: '/recent', label: '최근 작업', icon: 'clock' },
  { to: '/more', label: '더보기', icon: 'menu' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
          <span className="tabbar__icon"><Icon name={t.icon} size={22} /></span>
          <span className="tabbar__label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'lime-outline' | 'ghost'; block?: boolean };

export function Button({ variant = 'primary', block = true, className, children, ...rest }: BtnProps) {
  return (
    <button type="button" className={`btn btn--${variant}${block ? ' btn--block' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </button>
  );
}

export function IconTile({ icon, size = 44 }: { icon: IconName; size?: number }) {
  const tone = ICON_TONE[icon] ?? 'blue';
  return (
    <span className={`icon-tile icon-tile--${tone}`} style={{ width: size, height: size }}>
      <Icon name={icon} size={Math.round(size * 0.52)} filled={icon === 'star' ? true : undefined} />
    </span>
  );
}

export function Badge({ label }: { label: PresetLabel | '준비 중' }) {
  const cls = label === '공식' ? 'official' : label === 'MY' ? 'my' : label === '준비 중' ? 'pending' : 'general';
  return <span className={`badge badge--${cls}`}>{label}</span>;
}

export function Toggle({ checked, onChange, label, disabled, hint }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean; hint?: string }) {
  return (
    <label className={`toggle-row${disabled ? ' is-disabled' : ''}`}>
      <span className="toggle-row__text">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} readOnly={!onChange} onChange={onChange ? (e) => onChange(e.target.checked) : undefined} />
      <span className="toggle" aria-hidden />
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          className={`segmented__item${value === o.value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── 토스트 ─────────────────────────────────────────────

const ToastCtx = createContext<(msg: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`toast${msg ? ' is-visible' : ''}`} role="status" aria-live="polite">{msg}</div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** 공식 규격 안내 문구(9-14) */
export const DISCLAIMER = '파일 조건 검사 결과는 참고용이며 기관의 최종 심사를 보장하지 않습니다.';
