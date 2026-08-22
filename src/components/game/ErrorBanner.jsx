/** Shared error banner, with an optional retry action. */
export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 px-3 py-1 bg-red-700 text-white text-xs font-black uppercase border-2 border-red-800"
        >
          Retry
        </button>
      )}
    </div>
  )
}
