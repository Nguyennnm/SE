import type { CSSProperties } from 'react';
const paths: Record<string, React.ReactNode> = {
  search: <><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 4 4"/></>,
  arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  down: <path d="m6 9 6 6 6-6"/>,
  heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/>,
  filter: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="17" r="2" fill="currentColor"/></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  list: <><path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  laptop: <><rect x="5" y="4" width="14" height="12" rx="1.5"/><path d="m5 16-3 4h20l-3-4M9 20h6"/></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/></>,
  headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/></>,
  shield: <><path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Z"/><path d="m8 11 3 3 5-5"/></>,
  truck: <><path d="M2 5h12v12H2zM14 9h4l4 5v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  return: <><path d="M4 5v6h6M4 11a8 8 0 1 1 1 7"/></>,
  spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>,
};
export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name] ?? paths.laptop}</svg>;
}
