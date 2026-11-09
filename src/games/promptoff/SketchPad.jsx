import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { BRUSH_COLORS, BRUSH_SIZES } from './constants'

function fillWhite(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function canvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect()
  const point = e.touches ? e.touches[0] : e
  return {
    x: (point.clientX - rect.left) * (canvas.width / rect.width),
    y: (point.clientY - rect.top) * (canvas.height / rect.height),
  }
}

/**
 * Optional sketch that guides the AI. The parent owns canvasRef (to read the
 * image). onStroke() runs while drawing, onClear() after the canvas is wiped.
 */
export default function SketchPad({ canvasRef, onStroke, onClear }) {
  const [color, setColor] = useState('#1A1A2E')
  const [size, setSize] = useState(8)
  const drawingRef = useRef(false)

  useEffect(() => {
    if (canvasRef.current) fillWhite(canvasRef.current)
  }, [canvasRef])

  function start(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = canvasPos(e, canvas)
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    drawingRef.current = true
  }

  function move(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!drawingRef.current || !canvas) return
    const pos = canvasPos(e, canvas)
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    onStroke()
  }

  function end(e) {
    if (e) e.preventDefault()
    if (!drawingRef.current) return
    drawingRef.current = false
    onStroke()
  }

  function clear() {
    if (canvasRef.current) fillWhite(canvasRef.current)
    onClear()
  }

  return (
    <details className="group">
      <summary className="text-xs font-black text-navy/50 uppercase cursor-pointer hover:text-navy/70 select-none">
        + Sketch to guide the AI (optional)
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <div style={{ border: '3px solid #1A1A2E' }}>
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            aria-label="Sketch canvas"
            className="w-full cursor-crosshair touch-none"
            style={{ display: 'block', background: '#fff', aspectRatio: '1' }}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {BRUSH_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Brush color ${c}`}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'border-primary scale-110' : 'border-navy/20'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-6 bg-navy/10 mx-0.5" />
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              aria-label={`Brush size ${s}`}
              className={`flex items-center justify-center w-8 h-8 border-2 ${size === s ? 'border-primary bg-primary/10' : 'border-navy/20'}`}
            >
              <span className="rounded-full bg-navy" style={{ width: Math.min(s, 12), height: Math.min(s, 12) }} />
            </button>
          ))}
          <button onClick={clear} className="ml-auto p-1.5 border-2 border-navy/20 hover:border-red-400 hover:bg-red-50" title="Clear" aria-label="Clear sketch">
            <Trash2 className="w-4 h-4 text-navy/50" />
          </button>
        </div>
      </div>
    </details>
  )
}
