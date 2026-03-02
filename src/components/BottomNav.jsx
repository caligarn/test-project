import { NavLink } from 'react-router-dom'
import { Home, Trophy, Crown, User } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Games' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { to: '/subscribe', icon: Crown, label: 'Pro' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy border-t-4 border-highlight z-50 px-2 py-1">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 transition-colors no-underline ${
                isActive
                  ? 'text-highlight'
                  : 'text-white/50 hover:text-white/80'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
