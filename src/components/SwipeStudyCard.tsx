import { useRef, useState, type ReactNode } from 'react'
import { swipeAction } from '../features/study/navigation'

interface Props {
  children: ReactNode
  flipped: boolean
  label: string
  canRate: boolean
  canPrevious: boolean
  canNext: boolean
  onFlip: () => void
  onRate: (knew: boolean) => unknown
  onNavigate: (direction: -1 | 1) => void
}

export function SwipeStudyCard({ children, flipped, label, canRate, canPrevious, canNext, onFlip, onRate, onNavigate }: Props) {
  const start = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const action = swipeAction(offset.x, offset.y)
  const horizontal = Math.abs(offset.x) > Math.abs(offset.y) * 1.4
  const tint = canRate && horizontal ? (offset.x > 0 ? 'correct' : 'incorrect') : ''
  const hint = action === 'correct' || action === 'incorrect'
    ? canRate ? action === 'correct' ? '✓ Gewusst' : '× Nicht gewusst' : 'Bewerten erst nach dem Aufdecken und nur einmal'
    : action === 'previous' ? canPrevious ? '↓ Vorherige Karte' : 'Anfang der Runde'
      : action === 'next' ? canNext ? '↑ Nächste Karte' : 'Keine weitere Karte' : ''

  function cancel() {
    if (start.current) suppressClick.current = true
    start.current = null
    setDragging(false)
    setOffset({ x: 0, y: 0 })
  }

  return <button
    className={`flip-card swipe-card ${flipped ? 'flip-card--flipped' : ''} ${dragging ? 'swipe-card--dragging' : ''}`}
    type="button"
    aria-label={label}
    aria-describedby="study-swipe-help"
    style={{ transform: `translate(${offset.x * 0.55}px, ${offset.y * 0.55}px) rotate(${offset.x * 0.025}deg)` }}
    onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0 || start.current) return
      suppressClick.current = false
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false }
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }}
    onPointerMove={(event) => {
      const origin = start.current
      if (!origin || origin.id !== event.pointerId) return
      const x = event.clientX - origin.x
      const y = event.clientY - origin.y
      if (Math.hypot(x, y) > 10) origin.moved = true
      setOffset({ x, y })
    }}
    onPointerUp={(event) => {
      const origin = start.current
      if (!origin || origin.id !== event.pointerId) return
      const x = event.clientX - origin.x
      const y = event.clientY - origin.y
      const selected = swipeAction(x, y)
      suppressClick.current = origin.moved || Math.hypot(x, y) > 10
      start.current = null
      setDragging(false)
      setOffset({ x: 0, y: 0 })
      if (selected === 'correct' && canRate) onRate(true)
      if (selected === 'incorrect' && canRate) onRate(false)
      if (selected === 'previous' && canPrevious) onNavigate(-1)
      if (selected === 'next' && canNext) onNavigate(1)
    }}
    onPointerCancel={cancel}
    onLostPointerCapture={() => { if (start.current) cancel() }}
    onClick={(event) => {
      if (event.detail === 0 || !suppressClick.current) onFlip()
      suppressClick.current = false
    }}
  >
    {children}
    <span aria-hidden="true" className={`swipe-card__tint swipe-card__tint--${tint}`}
      style={{ opacity: tint ? Math.min(Math.abs(offset.x) / 160, 0.65) : 0 }} />
    {hint && <span aria-hidden="true" className="swipe-card__feedback">{hint}</span>}
  </button>
}
