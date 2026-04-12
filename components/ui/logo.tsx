import Link from 'next/link'

// ── Logo colors ───────────────────────────────────────────────────────────────
const LOGO_GREEN = '#3DBF79'

// ── Circle mark ──────────────────────────────────────────────────────────────

function SmileMark({ s, variant }: { s: number; variant: 'color' | 'white' }) {
  const half = s / 2
  const r = half - 1
  // Smile arc: spans from 25% to 75% of width, control point at 88% height
  const x1 = s * 0.25
  const x2 = s * 0.75
  const y0 = s * 0.63   // endpoints y
  const yc = s * 0.87   // control point y (depth of curve)
  const sw = Math.max(2.5, s * 0.094) // stroke-width

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" aria-hidden="true" focusable="false">
      <circle
        cx={half}
        cy={half}
        r={r}
        fill={variant === 'color' ? LOGO_GREEN : 'rgba(255,255,255,0.13)'}
        stroke={variant === 'white' ? 'rgba(255,255,255,0.35)' : 'none'}
        strokeWidth={variant === 'white' ? 1.5 : 0}
      />
      <path
        d={`M${x1} ${y0} Q${half} ${yc} ${x2} ${y0}`}
        stroke={variant === 'color' ? 'white' : LOGO_GREEN}
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LogoProps {
  /**
   * Height of the circle mark in px. Text scales automatically.
   * Common values: 28 (sm), 32 (mobile), 36 (default), 40 (lg)
   */
  iconSize?: number
  href?: string
  className?: string
}

// ── Color logo — for white / light backgrounds ────────────────────────────────

export function LogoColor({ iconSize = 36, href, className = '' }: LogoProps) {
  const fontSize = Math.round(iconSize * 0.595)

  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="PropZen">
      <SmileMark s={iconSize} variant="color" />
      <span
        className="font-extrabold leading-none tracking-tight"
        style={{ fontSize }}
      >
        <span style={{ color: '#111827' }}>Prop</span>
        <span style={{ color: LOGO_GREEN }}>Zen</span>
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="PropZen — página inicial">
        {mark}
      </Link>
    )
  }
  return mark
}

// ── White logo — for dark / colored backgrounds ───────────────────────────────

export function LogoWhite({ iconSize = 36, href, className = '' }: LogoProps) {
  const fontSize = Math.round(iconSize * 0.595)

  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="PropZen">
      <SmileMark s={iconSize} variant="white" />
      <span
        className="font-extrabold leading-none tracking-tight text-white"
        style={{ fontSize }}
      >
        PropZen
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="PropZen — página inicial">
        {mark}
      </Link>
    )
  }
  return mark
}
