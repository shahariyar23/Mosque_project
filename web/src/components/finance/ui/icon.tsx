import type { SVGProps } from "react";

/**
 * Inline stroke icons. Keeping them in one file avoids pulling an icon package into the
 * bundle and lets every finance surface use the same 1.5px optical weight.
 */
export type IconName =
  | "grid"
  | "settings"
  | "moon"
  | "users"
  | "calendar"
  | "book"
  | "wallet"
  | "gauge"
  | "list"
  | "gift"
  | "repeat"
  | "vault"
  | "receipt-minus"
  | "badge"
  | "rotate"
  | "receipt"
  | "chart"
  | "megaphone"
  | "image"
  | "shield"
  | "plus"
  | "search"
  | "filter"
  | "close"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "arrow-up"
  | "arrow-down"
  | "arrow-right"
  | "arrow-down-right"
  | "download"
  | "printer"
  | "eye"
  | "pencil"
  | "trash"
  | "check"
  | "check-circle"
  | "alert"
  | "info"
  | "clock"
  | "refresh"
  | "upload"
  | "coins"
  | "banknote"
  | "trending-up"
  | "trending-down"
  | "mosque"
  | "menu"
  | "user"
  | "file-text"
  | "sparkle"
  | "pause"
  | "play"
  | "scale"
  | "lock"
  | "inbox"
  /* Community, prayer and settings surfaces. Same 1.5px optical weight as everything above. */
  | "calendar-days"
  | "clipboard-check"
  | "hands-heart"
  | "heart"
  | "user-plus"
  | "sunrise"
  | "sun"
  | "sunset"
  | "moon-star"
  | "bell"
  | "palette"
  | "key"
  | "map-pin"
  | "map"
  | "phone"
  | "mail"
  | "globe"
  | "facebook"
  | "youtube"
  | "instagram"
  | "graduation-cap"
  | "utensils"
  | "camera"
  | "monitor"
  | "sliders"
  | "star"
  | "x-circle"
  | "dots";

const paths: Record<IconName, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.5 1.5 0 1 1-2.1 2.1l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.5 1.5 0 1 1-3 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a1.5 1.5 0 1 1-2.1-2.1l.1-.1A1.6 1.6 0 0 0 4.6 15a1.5 1.5 0 0 1-1.5-1.5 1.5 1.5 0 0 1 1.5-1.5 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a1.5 1.5 0 1 1 2.1-2.1l.1.1A1.6 1.6 0 0 0 10.5 4.6 1.5 1.5 0 0 1 12 3.1a1.5 1.5 0 0 1 1.5 1.5 1.6 1.6 0 0 0 2.7 1.1l.1-.1a1.5 1.5 0 1 1 2.1 2.1l-.1.1a1.6 1.6 0 0 0 1.1 2.7 1.5 1.5 0 0 1 0 3 1.6 1.6 0 0 0-1.1.9z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M12 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM17 5.2a3 3 0 0 1 0 5.6M21 19v-1a3.6 3.6 0 0 0-2.6-3.4",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  book: "M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3zM17 7h2v13M9 8h4",
  wallet: "M4 7h13a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H4zM4 7V5.5A1.5 1.5 0 0 1 5.5 4H15M16 13.5h1.5",
  gauge: "M12 20a8 8 0 1 1 8-8M12 12l4.5-3.2M20 12h-1.5M12 4v1.5M5 8.5l1.2.8",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  gift: "M4 10h16v10H4zM4 7h16v3H4zM12 7v13M12 7S10.8 4 9 4a2 2 0 0 0 0 3zM12 7s1.2-3 3-3a2 2 0 0 1 0 3z",
  repeat: "M6 8h10a3 3 0 0 1 3 3v1M18 16H8a3 3 0 0 1-3-3v-1M8 5 5.5 8 8 11M16 13l2.5 3-2.5 3",
  vault: "M4 5h16v14H4zM12 12h.01M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM7 19v2M17 19v2",
  "receipt-minus": "M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 9h5M9.5 13h5",
  badge: "M12 3 9.5 5.2 6.2 5l-.4 3.3L3 10l1.6 2.9L3 15.8l2.8 1.7.4 3.3 3.3-.2L12 22l2.5-1.4 3.3.2.4-3.3 2.8-1.7-1.6-2.9L21 10l-2.8-1.7-.4-3.3-3.3.2z",
  rotate: "M20 12a8 8 0 1 1-2.7-6M20 4v5h-5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5M9.5 16h2.5",
  chart: "M4 20h16M7 20v-6M12 20V8M17 20v-9",
  megaphone: "M4 10v4l12 5V5zM16 8h2a3 3 0 0 1 0 6h-2M7 15v4",
  image: "M4 5h16v14H4zM4 15.5l4.5-4 4 3.5 3-3L20 16",
  shield: "M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z",
  plus: "M12 5v14M5 12h14",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16.2 16.2 21 21",
  filter: "M3 6h18l-7 8v6l-4-2v-4z",
  close: "M6 6l12 12M18 6 6 18",
  "chevron-down": "M6 9l6 6 6-6",
  "chevron-right": "M9 6l6 6-6 6",
  "chevron-left": "M15 6l-6 6 6 6",
  "arrow-up": "M12 20V4M6 10l6-6 6 6",
  "arrow-down": "M12 4v16M6 14l6 6 6-6",
  "arrow-right": "M4 12h16M14 6l6 6-6 6",
  "arrow-down-right": "M7 7l10 10M17 9v8H9",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  printer: "M7 9V4h10v5M7 17H5V9h14v8h-2M7 14h10v6H7z",
  eye: "M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  pencil: "M4 20h4l10-10-4-4L4 16zM14 6l4 4M4 20v-4",
  trash: "M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6",
  check: "M5 13l4.5 4.5L19 8",
  "check-circle": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.8 2.8L16 10",
  alert: "M12 4l8.5 15H3.5zM12 10v4M12 16.5h.01",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3.2 2",
  refresh: "M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4",
  upload: "M12 16V5M7 10l5-5 5 5M5 20h14",
  coins: "M8.5 4.5c3 0 5.5 1.2 5.5 2.7S11.5 10 8.5 10 3 8.7 3 7.2 5.5 4.5 8.5 4.5zM3 7.2v4c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-4M15.5 10c3 0 5.5 1.2 5.5 2.8s-2.5 2.7-5.5 2.7-5.5-1.2-5.5-2.7M10 12.8v4c0 1.5 2.5 2.7 5.5 2.7s5.5-1.2 5.5-2.7v-4",
  banknote: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.5 10.5h.01M17.5 13.5h.01",
  "trending-up": "M4 17l6-6 3.5 3.5L20 8M20 8h-4.5M20 8v4.5",
  "trending-down": "M4 8l6 6 3.5-3.5L20 17M20 17h-4.5M20 17v-4.5",
  mosque: "M12 3c2.2 1.6 3.5 3.4 3.5 5.2H8.5C8.5 6.4 9.8 4.6 12 3zM5 21V11a2.5 2.5 0 0 1 5 0v10M14 21V11a2.5 2.5 0 0 1 5 0v10M3 21h18M10 21v-4.5h4V21",
  menu: "M4 7h16M4 12h16M4 17h16",
  user: "M12 4a3.6 3.6 0 1 0 0 7.2A3.6 3.6 0 0 0 12 4zM5 20v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1",
  "file-text": "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  pause: "M9 5v14M15 5v14",
  play: "M7 4.5 19 12 7 19.5z",
  scale: "M12 4v16M7 8H4l3 6h3zM17 8h3l-3 6h-3zM7 8l5-2 5 2M6 20h12",
  lock: "M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3M12 15v2.5",
  inbox: "M3 12h5l1.5 3h5L16 12h5M3 12l3-7h12l3 7v8H3z",
  "calendar-days":
    "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 16.5h.01M12 16.5h.01",
  "clipboard-check":
    "M9 4h6v3H9zM9 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H15M9.2 13.6l2.2 2.2 4.4-4.4",
  "hands-heart":
    "M12 8.6c-1-1.7-3.7-1.4-3.7 1 0 1.7 2.3 3.2 3.7 4.2 1.4-1 3.7-2.5 3.7-4.2 0-2.4-2.7-2.7-3.7-1zM3 20.5v-4.7a2 2 0 0 1 3.5-1.4L9 17M21 20.5v-4.7a2 2 0 0 0-3.5-1.4L15 17",
  heart: "M12 20s-7-4.3-7-9.2A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.8C19 15.7 12 20 12 20z",
  "user-plus": "M11 4a3.6 3.6 0 1 0 0 7.2A3.6 3.6 0 0 0 11 4zM4 20v-1a4 4 0 0 1 4-4h4M18 14.5v6M15 17.5h6",
  sunrise: "M12 3v4.5M9.5 6 12 3.5 14.5 6M4.2 11.2l1.4 1.4M19.8 11.2l-1.4 1.4M3 18h18M7 18a5 5 0 0 1 10 0M9 21h6",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4",
  sunset: "M12 8V3.5M9.5 6 12 8.5 14.5 6M4.2 11.2l1.4 1.4M19.8 11.2l-1.4 1.4M3 18h18M7 18a5 5 0 0 1 10 0M9 21h6",
  "moon-star": "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5zM17.6 2.8l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z",
  bell: "M18 15.5V10a6 6 0 1 0-12 0v5.5L4.4 18.5h15.2zM10 21h4",
  palette:
    "M12 3a9 9 0 0 0 0 18c1.4 0 1.9-1 1.4-1.9-.6-1 .1-2.3 1.3-2.3H18a3 3 0 0 0 3-3.2C20.5 7.6 16.8 3 12 3zM7.6 9.6h.01M11 7.4h.01M15.4 8.6h.01M7.1 14.1h.01",
  key: "M15.5 4a4.5 4.5 0 1 0-3.2 7.7L4 20v1h3v-2h2v-2h1.9l1.4-1.4A4.5 4.5 0 0 0 15.5 4zM16.6 7.4h.01",
  "map-pin": "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  phone:
    "M6.5 3h3l1.6 4-2.1 1.4a11.5 11.5 0 0 0 6.6 6.6L17 12.9l4 1.6v3A2.5 2.5 0 0 1 18.2 20C10.4 19.2 4.8 13.6 4 5.8A2.5 2.5 0 0 1 6.5 3z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9.5h17M3.5 14.5h17M12 3c2.4 2.4 3.5 5.4 3.5 9s-1.1 6.6-3.5 9c-2.4-2.4-3.5-5.4-3.5-9S9.6 5.4 12 3z",
  facebook: "M15.5 3h-2.7A3.8 3.8 0 0 0 9 6.8V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7.2a1 1 0 0 1 1-1h2.2z",
  youtube: "M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5zM10.5 9.5 15 12l-4.5 2.5z",
  instagram: "M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM16.9 7.2h.01",
  "graduation-cap": "M3 9l9-4 9 4-9 4zM7 11.2V16c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v-4.8M20.4 10.4V15",
  utensils: "M7 3v6a2 2 0 0 0 4 0V3M9 11v10M16.2 3c1.8.9 2.8 2.8 2.8 5.7 0 2-.8 3.4-1.8 3.9V21",
  camera: "M4 8h3.2L8.7 6h6.6L16.8 8H20v11H4zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  monitor: "M3 5h18v11H3zM9 20h6M12 16v4",
  sliders: "M4 8h9M17 8h3M4 16h3M11 16h9M14.5 5.5v5M8.5 13.5v5",
  star: "M12 4l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z",
  "x-circle": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6",
  dots: "M6 12h.01M12 12h.01M18 12h.01",
};

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export function Icon({ name, size = 18, className = "", ...rest }: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
