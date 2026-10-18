'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Delete } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { checkPin, hasPin, savePin } from '@/lib/auth'
import { family, type FamilyMember } from '@/lib/inventory'

const PIN_LENGTH = 4
const MAX_ATTEMPTS = 3
const LOCK_SECONDS = 30

/** Antique key outline in objectBoundingBox units: round bow on top, shaft and bit at the bottom. */
const KEY_PATH =
  'M0.2 0.45 A0.5 0.25 0 1 1 0.8 0.45 L0.8 0.775 L0.93 0.775 L0.93 0.815 L0.87 0.815 L0.87 0.855 L0.93 0.855 L0.93 0.905 L0.8 0.905 L0.8 0.965 Q0.8 0.985 0.78 0.985 L0.22 0.985 Q0.2 0.985 0.2 0.965 Z'

type Mode = 'pick' | 'enter' | 'create' | 'confirm'

type KeyPanelProps = {
  onSuccess: (member: FamilyMember) => void
  onBack: () => void
}

const members = family.filter((member) => member.access === 'member')

export function KeyPanel({ onSuccess, onBack }: KeyPanelProps) {
  const [mode, setMode] = useState<Mode>('pick')
  const [selected, setSelected] = useState<FamilyMember | null>(null)
  const [digits, setDigits] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const locked = lockedUntil > now
  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000))

  useEffect(() => {
    if (!locked) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [locked])

  const fail = useCallback((text: string) => {
    setMessage(text)
    setShake((count) => count + 1)
    setDigits('')
  }, [])

  const pickMember = async (member: FamilyMember) => {
    setBusy(true)
    setMessage(null)
    try {
      const exists = await hasPin(member.id)
      setSelected(member)
      setMode(exists ? 'enter' : 'create')
      setDigits('')
      setFirstPin('')
    } catch {
      setMessage('No pude consultar tu PIN. Revisa la conexión.')
    } finally {
      setBusy(false)
    }
  }

  const submit = useCallback(
    async (pin: string) => {
      if (!selected) return
      setBusy(true)
      try {
        if (mode === 'enter') {
          if (await checkPin(selected.id, pin)) {
            onSuccess(selected)
            return
          }
          const used = attempts + 1
          setAttempts(used)
          if (used >= MAX_ATTEMPTS) {
            setAttempts(0)
            setNow(Date.now())
            setLockedUntil(Date.now() + LOCK_SECONDS * 1000)
            fail(`Demasiados intentos. Espera ${LOCK_SECONDS} s.`)
          } else {
            fail(`PIN incorrecto · ${MAX_ATTEMPTS - used} intento${MAX_ATTEMPTS - used === 1 ? '' : 's'}`)
          }
        } else if (mode === 'create') {
          setFirstPin(pin)
          setMode('confirm')
          setDigits('')
          setMessage(null)
        } else if (mode === 'confirm') {
          if (pin !== firstPin) {
            setMode('create')
            setFirstPin('')
            fail('No coinciden. Crea tu PIN otra vez.')
          } else {
            await savePin(selected.id, pin)
            onSuccess(selected)
            return
          }
        }
      } catch {
        fail('Algo falló. Inténtalo de nuevo.')
      }
      setBusy(false)
    },
    [attempts, fail, firstPin, mode, onSuccess, selected],
  )

  const press = useCallback(
    (digit: string) => {
      if (busy || locked || digits.length >= PIN_LENGTH) return
      const next = digits + digit
      setDigits(next)
      setMessage(null)
      if (next.length === PIN_LENGTH) void submit(next)
    },
    [busy, digits, locked, submit],
  )

  const erase = useCallback(() => {
    if (busy) return
    setDigits((value) => value.slice(0, -1))
  }, [busy])

  const backToPick = useCallback(() => {
    setMode('pick')
    setSelected(null)
    setDigits('')
    setFirstPin('')
    setMessage(null)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (mode === 'pick') onBack()
        else backToPick()
      } else if (mode !== 'pick') {
        if (/^\d$/.test(event.key)) press(event.key)
        else if (event.key === 'Backspace') erase()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backToPick, erase, mode, onBack, press])

  const title =
    mode === 'enter' ? 'Ingresa tu PIN' : mode === 'create' ? 'Crea tu PIN' : mode === 'confirm' ? 'Repite tu PIN' : 'Casa Peralta'

  return (
    <div className="relative h-[720px] w-[360px] text-[#fdf3dc]">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id="keyClip" clipPathUnits="objectBoundingBox">
            <path d={KEY_PATH} />
          </clipPath>
        </defs>
      </svg>

      {/* glass body */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: 'url(#keyClip)',
          background: 'linear-gradient(150deg, rgb(255 236 200 / 0.22), rgb(60 40 24 / 0.55) 55%, rgb(30 20 12 / 0.6))',
          backdropFilter: 'blur(16px) saturate(150%)',
          WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        }}
      />
      <svg aria-hidden viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <path d={KEY_PATH} fill="none" stroke="rgb(255 226 170 / 0.65)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* ---------- bow (top circle) ---------- */}
      <div className="absolute left-[30px] top-[34px] flex h-[276px] w-[300px] flex-col items-center justify-center gap-2 text-center">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'pick' ? (
            <motion.div key="bow-pick" className="flex flex-col items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-amber-100/70">Bienvenidos a</p>
              <h2 className="font-serif text-[34px] leading-none">{title}</h2>
              <div className="my-1 h-px w-24 bg-amber-100/30" />
            </motion.div>
          ) : (
            <motion.div key="bow-pin" className="flex flex-col items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {selected && (
                <span className={`grid size-[68px] place-items-center rounded-2xl bg-gradient-to-br ${selected.tone} font-serif text-3xl text-stone-900 shadow-lg`}>
                  {selected.name.charAt(0)}
                </span>
              )}
              <p className="font-serif text-[26px] leading-none">{selected?.name}</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-amber-100/70">{title}</p>
              <motion.div key={shake} className="mt-1 flex gap-3" animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }} aria-label={`${digits.length} de ${PIN_LENGTH} dígitos`}>
                {Array.from({ length: PIN_LENGTH }, (_, i) => (
                  <span
                    key={i}
                    className={`size-3.5 rounded-full border transition ${i < digits.length ? 'border-amber-200 bg-amber-200 shadow-[0_0_10px_rgba(253,224,150,0.9)]' : 'border-amber-100/40 bg-black/30'}`}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <p role="status" className="min-h-[2.2em] max-w-[240px] text-[12px] leading-tight text-rose-200">
          {locked ? `Espera ${secondsLeft} s para volver a intentar.` : message}
        </p>
      </div>

      {/* ---------- shaft ---------- */}
      <div className="absolute left-[72px] top-[336px] h-[340px] w-[216px]">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'pick' ? (
            <motion.div key="shaft-pick" className="flex h-full flex-col items-center" initial={{ opacity: 0, rotateX: -50 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: 50 }} transition={{ duration: 0.3 }}>
              <p className="text-[10px] uppercase tracking-[0.26em] text-amber-100/70">Entra con tu PIN</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                {members.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => pickMember(member)}
                      disabled={busy}
                      className="group flex w-[96px] flex-col items-center gap-1.5 rounded-2xl p-1.5 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/80 disabled:opacity-60"
                    >
                      <span className={`grid size-[64px] place-items-center rounded-2xl bg-gradient-to-br ${member.tone} font-serif text-[26px] text-stone-900 shadow-md transition group-hover:scale-105`}>
                        {member.name.charAt(0)}
                      </span>
                      <span className="font-serif text-[17px] leading-none">{member.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onBack}
                className="mt-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-amber-100/70 outline-none transition hover:bg-white/10 hover:text-amber-50 focus-visible:ring-2 focus-visible:ring-amber-200/80"
              >
                <ArrowLeft aria-hidden className="size-3.5" />
                Alejarme de la puerta
              </button>
            </motion.div>
          ) : (
            <motion.div key="shaft-pin" className="flex h-full flex-col items-center" initial={{ opacity: 0, rotateX: -50 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: 50 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <KeyCap key={digit} label={digit} onClick={() => press(digit)} disabled={busy || locked} />
                ))}
                <KeyCap label="Atrás" aria="Volver a elegir persona" small onClick={backToPick} disabled={busy}>
                  <ArrowLeft aria-hidden className="size-4" />
                </KeyCap>
                <KeyCap label="0" onClick={() => press('0')} disabled={busy || locked} />
                <KeyCap label="Borrar" aria="Borrar dígito" small onClick={erase} disabled={busy}>
                  <Delete aria-hidden className="size-4" />
                </KeyCap>
              </div>
              <p className="mt-auto h-4 text-[10px] uppercase tracking-[0.2em] text-amber-100/60">{busy ? 'Girando la llave…' : ''}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function KeyCap({
  label,
  aria,
  small,
  onClick,
  disabled,
  children,
}: {
  label: string
  aria?: string
  small?: boolean
  onClick: () => void
  disabled?: boolean
  children?: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      aria-label={aria ?? label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ y: 3, boxShadow: '0 1px 0 #5a4630, inset 0 1px 0 rgba(255,255,255,0.4)' }}
      className={`grid h-[52px] w-[64px] place-items-center rounded-lg border border-[#5a4630] bg-gradient-to-b from-[#f3e6c8] to-[#c9b48a] font-mono text-[22px] font-bold text-[#3a2a16] shadow-[0_4px_0_#5a4630,inset_0_1px_0_rgba(255,255,255,0.6)] outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50 ${small ? 'text-[11px]' : ''}`}
    >
      {children ?? label}
    </motion.button>
  )
}
