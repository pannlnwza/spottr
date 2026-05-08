import {
  Bell,
  Film,
  LayoutDashboard,
  Search,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { cx } from '../utils/cx'

type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  to?: string
}

const navItems: NavItem[] = [
  { id: 'footage', label: 'Footage', icon: Film },
  { id: 'search', label: 'Search', icon: Search, to: '/search' },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'faces', label: 'Faces', icon: User },
]

export function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="flex w-14 min-w-14 flex-col items-center gap-1.5 border-r border-gray-200 bg-surface py-4"
    >
      <Link
        to="/"
        aria-label="Home"
        className="mb-3 flex h-7 w-7 items-center justify-center rounded-md active:scale-105 transition-transform"
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" fill="#2d2f33" />
          <circle cx="14" cy="14" r="5" fill="#f5f5f6" />
        </svg>
      </Link>
      {navItems.map((item) => (
        <NavButton key={item.id} item={item} />
      ))}
      <div className="flex-1" />
      <NavButton item={{ id: 'settings', label: 'Settings', icon: Settings }} />
    </nav>
  )
}

const BASE = 'flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors'

function NavButton({ item }: { item: NavItem }) {
  if (!item.to) {
    return (
      <button
        type="button"
        disabled
        title={item.label}
        aria-label={item.label}
        className={cx(BASE, 'border-0 bg-transparent opacity-40')}
      >
        <item.icon className="h-5 w-5 text-gray-500" strokeWidth={2} />
      </button>
    )
  }
  return (
    <NavLink
      to={item.to}
      title={item.label}
      aria-label={item.label}
      className={({ isActive }) =>
        cx(
          BASE,
          isActive
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-transparent hover:bg-gray-200',
        )
      }
    >
      {({ isActive }) => (
        <item.icon
          className={cx('h-5 w-5', isActive ? 'text-white' : 'text-gray-500')}
          strokeWidth={2}
        />
      )}
    </NavLink>
  )
}
