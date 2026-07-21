interface ProgressBarProps {
  value: number
  label?: string
  compact?: boolean
}

export function ProgressBar({ value, label = 'Lernfortschritt', compact = false }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)))

  return (
    <div className={`progress ${compact ? 'progress--compact' : ''}`}>
      <div className="progress__copy">
        <span>{label}</span>
        <strong>{safeValue} %</strong>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <span className="progress__fill" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}
