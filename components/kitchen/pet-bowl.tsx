'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'

type PetBowlProps = { name: string; tint: string; filled: boolean; delay?: number }

const KIBBLES = [
  [30, 21, 4.2, 12], [38, 19, 4, -20], [46, 18, 4.4, 40], [54, 18, 4.1, 5], [62, 19, 4.3, -35], [70, 21, 4, 25],
  [34, 23, 4.1, 60], [42, 22, 4.3, -10], [50, 21, 4.4, 80], [58, 22, 4, -50], [66, 23, 4.2, 15],
  [40, 16, 3.8, 30], [48, 15, 4, -25], [56, 15.5, 3.9, 55], [44, 12.5, 3.6, 10], [52, 12, 3.7, -40],
] as const

export function PetBowl({ name, tint, filled, delay = 0 }: PetBowlProps) {
  const id = useId()
  const body = `${id}-body`
  const rim = `${id}-rim`
  const clip = `${id}-clip`

  return (
    <svg viewBox="0 0 100 48" className="block w-full overflow-visible" role="img" aria-label={`Plato de ${name}${filled ? ', lleno' : ', vacío'}`}>
      <defs>
        <linearGradient id={body} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={tint} stopOpacity="0.75" />
          <stop offset="0.35" stopColor={tint} />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor={tint} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={rim} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f4f1ec" />
          <stop offset="1" stopColor="#b9b2a8" />
        </linearGradient>
        <clipPath id={clip}>
          <ellipse cx="50" cy="20" rx="36" ry="8" />
          <rect x="14" y="0" width="72" height="20" />
        </clipPath>
      </defs>

      <ellipse cx="50" cy="44" rx="46" ry="4" fill="black" opacity="0.35" />
      <path d="M6 20 Q10 42 26 43 L74 43 Q90 42 94 20 Z" fill={`url(#${body})`} />
      <path d="M22 36 Q50 40 78 36" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none" />
      <text x="50" y="33" textAnchor="middle" fontSize="6.5" letterSpacing="1.5" fill="white" fillOpacity="0.85" fontFamily="var(--font-sans)">
        {name.toUpperCase()}
      </text>
      <ellipse cx="50" cy="20" rx="44" ry="11" fill={`url(#${rim})`} />
      <ellipse cx="50" cy="20" rx="37" ry="8.2" fill="#3b3430" />
      <ellipse cx="50" cy="22" rx="30" ry="5" fill="#2a2421" />

      <g clipPath={`url(#${clip})`}>
        {KIBBLES.map(([cx, cy, r, rot], index) => (
          <motion.ellipse
            key={index}
            cx={cx}
            cy={cy}
            rx={r}
            ry={r * 0.72}
            transform={`rotate(${rot} ${cx} ${cy})`}
            fill={index % 3 === 0 ? '#8a5a2b' : index % 3 === 1 ? '#a8703a' : '#6f4520'}
            stroke="#4a2d14"
            strokeWidth="0.5"
            initial={false}
            animate={{ opacity: filled ? 1 : 0, y: filled ? 0 : -14 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 18,
              delay: filled ? delay + index * 0.025 : 0,
            }}
          />
        ))}
      </g>
    </svg>
  )
}
