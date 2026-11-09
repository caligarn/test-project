import { NavLink } from 'react-router-dom'
import { Home, Trophy, Coins, User, CalendarDays } from 'lucide-react'
import { useCredits } from '../context/CreditContext'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Games' },
  { to: '/play/daily', icon: CalendarDays, label: 'Daily' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { to: '/subscribe', icon: Coins, label: 'Credits', showCredits: true },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const { credits } = useCredits()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy border-t-4 border-highlight z-50 px-1 py-1">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const ItemIcon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-2 py-2 transition-colors no-underline ${
                  isActive
                    ? 'text-highlight'
                    : 'text-white/50 hover:text-white/80'
                }`
              }
            >
              <ItemIcon className="w-5 h-5" />
              {item.showCredits && credits && (
                <span className="absolute top-0.5 right-0 min-w-[18px] px-1 bg-highlight text-navy text-[9px] font-black leading-[14px] text-center border border-navy">
                  {credits.total}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
