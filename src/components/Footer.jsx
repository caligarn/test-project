import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="w-full border-t-3 border-navy bg-white pt-8 pb-24 md:pb-8 mt-auto" style={{ borderTopWidth: '3px' }}>
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-4">
        <img
          src="/machine-cinema-logo.png"
          alt="Machine Cinema"
          className="h-12 w-auto"
        />
        <nav className="flex flex-wrap justify-center gap-4 text-xs font-bold uppercase">
          <Link to="/" className="text-navy/60 hover:text-navy no-underline">Games</Link>
          <Link to="/leaderboard" className="text-navy/60 hover:text-navy no-underline">Leaderboard</Link>
          <Link to="/subscribe" className="text-navy/60 hover:text-navy no-underline">Credits</Link>
          <Link to="/settings" className="text-navy/60 hover:text-navy no-underline">Settings</Link>
        </nav>
        <p className="text-navy/50 text-xs font-medium uppercase tracking-wider">
          &copy; {new Date().getFullYear()} Machine Cinema. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
