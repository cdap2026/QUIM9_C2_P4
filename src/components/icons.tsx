import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "flask"
  | "atom"
  | "gauge"
  | "flame"
  | "wind"
  | "piston"
  | "balloon"
  | "lock"
  | "unlock"
  | "copy"
  | "shield"
  | "clock"
  | "download"
  | "file"
  | "mic"
  | "micOff"
  | "chevronRight"
  | "chevronLeft"
  | "chevronDown"
  | "arrowRight"
  | "arrowLeft"
  | "check"
  | "x"
  | "alert"
  | "user"
  | "users"
  | "search"
  | "play"
  | "pause"
  | "send"
  | "refresh"
  | "trash"
  | "eye"
  | "chart"
  | "book"
  | "spark"
  | "external"
  | "logout"
  | "settings"
  | "wifi"
  | "volume"
  | "clipboard"
  | "target"
  | "plus"
  | "minus"
  | "info"
  | "graduation"
  | "layers"
  | "activity"
  | "key"
  | "home"
  | "code"
  | "stop"
  | "edit"
  | "compass";

const paths: Record<IconName, ReactNode> = {
  flask: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6.2L5.4 17a2.4 2.4 0 0 0 2.1 3.5h9a2.4 2.4 0 0 0 2.1-3.5L14 9.2V3" />
      <path d="M7.5 14h9" />
      <circle cx="11" cy="17" r=".8" fill="currentColor" stroke="none" />
      <circle cx="14" cy="18.4" r=".6" fill="currentColor" stroke="none" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-60 12 12)" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.5 18a9 9 0 1 1 15 0" />
      <path d="M12 13.5 16 9" />
      <circle cx="12" cy="14.6" r="1.4" />
      <path d="M4 19h3M17 19h3" />
    </>
  ),
  flame: (
    <>
      <path d="M12 21c3.4 0 5.6-2.2 5.6-5.2 0-4.2-3.6-5.4-3.2-9.8-2.4.8-4.1 3-4.1 5.2 0 1-.4 1.6-1.1 2.1-.8-1-1-1.9-1-2.8-.9 1-1.8 2.8-1.8 5.1C6.4 18.7 8.6 21 12 21Z" />
      <path d="M12 21c1.4 0 2.4-1 2.4-2.4 0-1.6-1.6-2.1-1.4-4.1-1.5.8-2.6 2.2-2.6 3.7 0 1.6.8 2.8 1.6 2.8Z" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h10.5a2.8 2.8 0 1 0-2.7-3.4" />
      <path d="M3 12.5h15.6a2.6 2.6 0 1 1-2.5 3.1" />
      <path d="M3 17h7.5a2.4 2.4 0 1 1-2.3 2.9" />
    </>
  ),
  piston: (
    <>
      <rect x="5" y="3" width="14" height="5" rx="1.5" />
      <path d="M12 8v4" />
      <rect x="3.5" y="12" width="17" height="8.5" rx="2" />
      <path d="M7 16.4h10" />
    </>
  ),
  balloon: (
    <>
      <path d="M12 3.2c3.6 0 6 2.8 6 6.2 0 3.9-3.3 7-6 8.7-2.7-1.7-6-4.8-6-8.7 0-3.4 2.4-6.2 6-6.2Z" />
      <path d="M11 18.4 10 21h4l-1-2.6" />
      <path d="M9.5 7.4c1.6-1 3.2-.7 4.2.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.4" />
      <path d="M8 10V7.4a4 4 0 0 1 8 0V10" />
      <circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  unlock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.4" />
      <path d="M8 10V7.4a4 4 0 0 1 7.6-1.8" />
      <circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V5.8a2 2 0 0 0-2-2H5.8a2 2 0 0 0-2 2v7.7a2 2 0 0 0 2 2h2.7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.3c0 4.3 2.9 7.6 7 9.7 4.1-2.1 7-5.4 7-9.7V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11.5" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 17v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V17" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </>
  ),
  micOff: (
    <>
      <path d="M9 9v2a3 3 0 0 0 4.6 2.6M15 10.5V6a3 3 0 0 0-5.5-1.7" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 9.4 5.8M18.5 11.5v-.6M12 18v3M9 21h6M3.5 3.5l17 17" />
    </>
  ),
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M20 12H5" />
      <path d="m10.5 6-6 6 6 6" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="M5 5l14 14M19 5 5 19" />,
  alert: (
    <>
      <path d="M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 8.5v5M12 17.2v.1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.8 20.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 4.8a3.6 3.6 0 0 1 0 6.9M18 14.5a6.2 6.2 0 0 1 3.2 6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5-10-6.5Z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3 14 21l-3.5-7.5L3 10l18-7Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6.3" />
      <path d="M20 4v7h-7" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13.5h9L17.5 7" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="m7.5 15 3.5-4 3 2.5 4.5-6" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22V4.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M8 7h8M8 11h5" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 16.5 19.8 19l2.2.8-2.2.8L19 23l-.8-2.4-2.2-.8 2.2-.8.8-2.5Z" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M19 14v5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5H11" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.4l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 8.5a15 15 0 0 1 19 0M5.5 12a10.5 10.5 0 0 1 13 0M8.7 15.5a6 6 0 0 1 6.6 0" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h4l5-4v13l-5-4H4v-5Z" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.7 5.8a9 9 0 0 1 0 12.4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5M12 8v.1" />
    </>
  ),
  graduation: (
    <>
      <path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 11.5v4.8c0 1.6 2.5 3.2 5.5 3.2s5.5-1.6 5.5-3.2v-4.8M21.5 9v5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  activity: <path d="M2.5 12h4l2.5-6 4.5 12 2.5-6h5.5" />,
  key: (
    <>
      <circle cx="8" cy="15.5" r="4.5" />
      <path d="m11.3 12.2 8.2-8.2M16.5 7l2.5 2.5M14 9.5l2.5 2.5" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 10.5 8.5-7 8.5 7" />
      <path d="M5.5 9v11h13V9M10 20v-5.5h4V20" />
    </>
  ),
  code: (
    <>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  edit: (
    <>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
      <path d="m14.5 5.5 3 3" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.7, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
