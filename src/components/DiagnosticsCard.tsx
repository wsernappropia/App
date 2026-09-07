// Tarjeta plegable "Diagnóstico" (al final de Ajustes).
//
// Existe para poder depurar el APK instalado sin cable ni logcat. La regla de
// oro es que NO PUEDE COLGARSE: al abrirla se pintan de inmediato los hechos
// síncronos (`syncFacts`) y cada sonda asíncrona se resuelve por su cuenta con
// timeout de 5 s (`runProbes`), así que en el peor caso se ven líneas con
// "timeout: …" — nunca un "Recogiendo datos…" eterno.
//
// El texto se puede COMPARTIR (hoja de compartir de Android, la vía más fiable
// para mandarlo) o COPIAR; si el portapapeles falla, aparece un textarea con
// todo seleccionado para copiarlo a mano.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import { formatGlobalError, getGlobalErrors } from '../lib/diagnostics'
import type { GlobalErrorEntry } from '../lib/diagnostics'
import { pendingProbeLines, reportToText, runProbes, syncFacts } from '../lib/deviceReport'
import type { ReportLine } from '../lib/deviceReport'

const STATUS_CLASS: Record<ReportLine['status'], string> = {
  sync: 'text-white/80',
  pending: 'text-white/40',
  ok: 'text-white/80',
  failed: 'text-red',
}

export function DiagnosticsCard({ onToast }: { onToast?: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<ReportLine[]>([])
  const [errors, setErrors] = useState<readonly GlobalErrorEntry[]>([])
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  // Cada refresco tiene su número: las sondas del anterior ya no pintan nada.
  const runId = useRef(0)

  const refresh = useCallback(() => {
    const id = ++runId.current
    // 1) Lo que se sabe sin esperar a nadie, ya mismo.
    setLines([...syncFacts(), ...pendingProbeLines()])
    setErrors([...getGlobalErrors()])
    // 2) Cada sonda actualiza SU línea cuando termina (o cuando hace timeout).
    void runProbes((line) => {
      if (runId.current !== id) return
      setLines((prev) => prev.map((l) => (l.key === line.key ? line : l)))
      setErrors([...getGlobalErrors()])
    })
  }, [])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const text = () => reportToText(lines, errors)

  async function handleCopy() {
    const payload = text()
    try {
      await navigator.clipboard.writeText(payload)
      setCopyFallback(null)
      onToast?.('Diagnóstico copiado')
    } catch {
      // El WebView puede negar el portapapeles: se muestra para copiar a mano.
      setCopyFallback(payload)
      onToast?.('No se pudo copiar: cópialo a mano abajo')
    }
  }

  async function handleShare() {
    const payload = text()
    if (typeof navigator === 'undefined' || !navigator.share) {
      onToast?.('Compartir no está disponible aquí')
      setCopyFallback(payload)
      return
    }
    try {
      await navigator.share({ title: 'Momentum · diagnóstico', text: payload })
    } catch {
      // Cancelar la hoja de compartir también entra aquí: no es un fallo.
      setCopyFallback(payload)
    }
  }

  const pending = lines.filter((l) => l.status === 'pending').length

  return (
    <Card>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-extrabold text-white">Diagnóstico</span>
          <span className="block text-xs text-white/45">
            Qué ve la app en este dispositivo. Útil para reportar un problema.
          </span>
        </span>
        <span className="shrink-0 text-lg font-bold text-white/50">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4">
          <dl data-testid="diagnostics-lines" className="flex flex-col gap-2">
            {lines.map((line) => (
              <div key={line.key} className="flex flex-col gap-0.5">
                <dt className="text-[11px] uppercase tracking-wide text-white/35">{line.label}</dt>
                <dd className={`break-words font-mono text-xs ${STATUS_CLASS[line.status]}`}>
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-white/5 pt-3">
            <p className="text-[11px] uppercase tracking-wide text-white/35">
              Errores capturados ({errors.length})
            </p>
            <ul data-testid="diagnostics-errors" className="mt-1 flex flex-col gap-1">
              {errors.length === 0 && <li className="font-mono text-xs text-white/40">ninguno</li>}
              {errors.map((e, i) => (
                <li key={`${e.at}-${i}`} className="break-words font-mono text-xs text-red">
                  {formatGlobalError(e)}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => void handleShare()}>
              Compartir
            </Button>
            <Button variant="secondary" block onClick={() => void handleCopy()}>
              Copiar
            </Button>
            <Button variant="secondary" block onClick={refresh}>
              Actualizar
            </Button>
          </div>

          {pending > 0 && (
            <p className="text-xs text-white/40">
              {pending} comprobación/es en curso… (se rinden solas a los 5 s)
            </p>
          )}

          {copyFallback && (
            <textarea
              data-testid="diagnostics-fallback"
              readOnly
              value={copyFallback}
              onFocus={(e) => e.currentTarget.select()}
              className="h-40 w-full rounded-xl bg-white/10 p-3 font-mono text-xs text-white/80 outline-none"
            />
          )}
        </div>
      )}
    </Card>
  )
}
