import type { SVGProps } from 'react'
import type { TabId } from '../types'

type IconName = TabId | 'search' | 'arrow' | 'external' | 'plus' | 'archive' | 'download' | 'upload' | 'close' | 'edit' | 'check'

const paths: Record<IconName, React.ReactNode> = {
  dashboard: <><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></>,
  books: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z"/></>,
  recipes: <><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></>,
  seeds: <><path d="M12 21v-9"/><path d="M12 15c-4.5 0-7-2.5-7-7 4.5 0 7 2.5 7 7Z"/><path d="M12 12c0-4.5 2.5-7 7-7 0 4.5-2.5 7-7 7Z"/></>,
  vhs: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><circle cx="16" cy="12" r="2.5"/><path d="M10.5 12h3"/></>,
  tools: <><path d="m14 6 4-4 4 4-4 4"/><path d="m16 8-9.5 9.5a2.1 2.1 0 1 0 3 3L19 11"/><path d="M5 5 2 2M6.5 2 2 6.5"/></>,
  runs: <><circle cx="8" cy="8" r="4"/><path d="M2 21a6 6 0 0 1 12 0"/><path d="M17 8h5M19.5 5.5v5M16 15h6M16 19h6"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  external: <><path d="M14 3h7v7M10 14 21 3"/><path d="M18 13v7H4V6h7"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  archive: <><path d="M3 6h18v4H3zM5 10v10h14V10M9 14h6"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 21h16"/></>,
  close: <path d="m5 5 14 14M19 5 5 19"/>,
  edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z"/><path d="m13.5 7 3.5 3.5"/></>,
  check: <path d="m4 12 5 5L20 6"/>
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
