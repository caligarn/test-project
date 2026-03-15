export default function Footer() {
  return (
    <footer className="w-full border-t-3 border-navy bg-white py-8 mt-auto" style={{ borderTopWidth: '3px' }}>
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-4">
        <img
          src="/machine-cinema-logo.png"
          alt="Machine Cinema"
          className="h-12 w-auto"
        />
        <p className="text-navy/50 text-xs font-medium uppercase tracking-wider">
          &copy; {new Date().getFullYear()} Machine Cinema. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
