import { useRef, useState } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Stepper } from '../components/Stepper'
import { Sheet } from '../components/Sheet'
import { Toggle } from '../components/Toggle'
import { useToast } from '../components/Toast'
import { IconCheck, IconPill } from '../components/icons'
import { useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { ALL_SUPPLEMENTS } from '../lib/supplements'
import { DAY_SHORT } from '../lib/dates'
import type { SupplementId } from '../lib/types'

declare const __APP_VERSION__: string | undefined

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // lunes..domingo

export default function Settings() {
  const state = useStore()
  const { settings } = state
  const { show } = useToast()
  const go = useNav((s) => s.go)

  const [resetOpen, setResetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [exportText, setExportText] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleSupplementEnabled(id: SupplementId) {
    const enabled = settings.enabledSupplements.includes(id)
    const next = enabled
      ? settings.enabledSupplements.filter((s) => s !== id)
      : [...settings.enabledSupplements, id]
    state.updateSettings({ enabledSupplements: next })
  }

  function toggleStrengthDay(day: number) {
    if (day === settings.restDay) return
    const enabled = settings.strengthDays.includes(day)
    const next = enabled ? settings.strengthDays.filter((d) => d !== day) : [...settings.strengthDays, day]
    state.updateSettings({ strengthDays: next })
  }

  function setRestDay(day: number | null) {
    const strengthDays = day === null ? settings.strengthDays : settings.strengthDays.filter((d) => d !== day)
    state.updateSettings({ restDay: day, strengthDays })
  }

  async function handleExport() {
    const json = state.exportJSON()
    try {
      await navigator.clipboard.writeText(json)
      show('Copiado al portapapeles')
    } catch {
      setExportText(json)
    }
  }

  function handleDownload() {
    const json = state.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `momentum-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const ok = state.importJSON(importText)
    if (ok) {
      show('Datos importados')
      setImportOpen(false)
      setImportText('')
    } else {
      show('El archivo no es válido')
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImportText(String(reader.result ?? ''))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleReset() {
    state.resetAll()
    setResetOpen(false)
    show('Datos borrados')
    // Volvemos a Hoy: ahí aparece el onboarding de nuevo.
    go('today')
  }

  const version = typeof __APP_VERSION__ !== 'undefined' ? `Momentum v${__APP_VERSION__}` : 'Momentum v0.1'

  return (
    <Screen title="Ajustes" subtitle="Todo se guarda al instante">
      <div className="flex flex-col gap-4">
        <Card>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-white/70">Tu nombre</span>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => state.updateSettings({ name: e.target.value })}
              placeholder="¿Cómo te llamamos?"
              className="h-11 rounded-xl bg-white/10 px-3 text-base font-bold text-white outline-none focus:ring-2 focus:ring-teal"
            />
          </label>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-extrabold text-white">Proteína</p>
          <div className="flex flex-col gap-4">
            <Stepper
              label="Meta diaria"
              value={settings.proteinGoal}
              min={settings.proteinMin + 5}
              max={200}
              step={5}
              suffix=" g"
              onChange={(v) => state.updateSettings({ proteinGoal: v })}
            />
            <Stepper
              label="Mínimo diario"
              value={settings.proteinMin}
              min={60}
              max={settings.proteinGoal - 5}
              step={5}
              suffix=" g"
              onChange={(v) => state.updateSettings({ proteinMin: v })}
            />
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <IconPill size={18} className="text-white/60" />
            <p className="text-sm font-extrabold text-white">Suplementos activos</p>
          </div>
          <div className="flex flex-col gap-3">
            {ALL_SUPPLEMENTS.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{s.name}</p>
                  <p className="truncate text-xs text-white/45">{s.dose}</p>
                </div>
                <Toggle
                  checked={settings.enabledSupplements.includes(s.id)}
                  onChange={() => toggleSupplementEnabled(s.id)}
                  label={`Activar ${s.name}`}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-extrabold text-white">Días de fuerza</p>
          <div className="flex gap-1.5">
            {DAY_ORDER.map((day) => {
              const active = settings.strengthDays.includes(day)
              const isRest = day === settings.restDay
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isRest}
                  aria-pressed={active}
                  aria-label={`${active ? 'Quitar' : 'Añadir'} día de fuerza: ${DAY_SHORT[day]}`}
                  onClick={() => toggleStrengthDay(day)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-xl text-xs font-extrabold uppercase transition-colors ${
                    isRest
                      ? 'cursor-not-allowed bg-white/5 text-white/20'
                      : active
                        ? 'bg-teal text-navy-deep'
                        : 'bg-white/10 text-white/60'
                  }`}
                >
                  {DAY_SHORT[day].slice(0, 1).toUpperCase()}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-white/40">Los demás días (salvo descanso) serán de caminata.</p>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-extrabold text-white">Día de descanso</p>
          <div className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={settings.restDay === day}
                onClick={() => setRestDay(day)}
                className={`flex h-11 min-w-[44px] flex-1 items-center justify-center rounded-xl text-xs font-extrabold uppercase transition-colors ${
                  settings.restDay === day ? 'bg-teal text-navy-deep' : 'bg-white/10 text-white/60'
                }`}
              >
                {DAY_SHORT[day].slice(0, 1).toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={settings.restDay === null}
              onClick={() => setRestDay(null)}
              className={`flex h-11 flex-[2] items-center justify-center rounded-xl px-2 text-xs font-extrabold uppercase transition-colors ${
                settings.restDay === null ? 'bg-teal text-navy-deep' : 'bg-white/10 text-white/60'
              }`}
            >
              Ninguno
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-white">Agua (opcional)</p>
              <p className="text-xs text-white/45">Muestra el contador de vasos en Hoy</p>
            </div>
            <Toggle
              checked={settings.waterEnabled}
              onChange={(v) => state.updateSettings({ waterEnabled: v })}
              label="Activar seguimiento de agua"
            />
          </div>
          {settings.waterEnabled && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <Stepper
                label="Meta de vasos"
                value={settings.waterGoal}
                min={1}
                max={16}
                step={1}
                onChange={(v) => state.updateSettings({ waterGoal: v })}
              />
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-extrabold text-white">Datos</p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={handleExport}>
                Exportar (copiar)
              </Button>
              <Button variant="secondary" block onClick={handleDownload}>
                Descargar
              </Button>
            </div>
            {exportText && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-white/50">
                  No se pudo copiar automáticamente. Copia el texto manualmente:
                </p>
                <textarea
                  readOnly
                  value={exportText}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-32 w-full rounded-xl bg-white/10 p-3 font-mono text-xs text-white/80 outline-none"
                />
              </div>
            )}
            <Button variant="secondary" block onClick={() => setImportOpen(true)}>
              Importar
            </Button>
            <Button variant="danger" block onClick={() => setResetOpen(true)}>
              Borrar todo
            </Button>
          </div>
        </Card>

        <footer className="flex flex-col items-center gap-1 pb-4 pt-2 text-center">
          <span className="text-xs font-bold text-white/40">{version}</span>
          <span className="text-[11px] text-white/25">Datos guardados solo en este dispositivo.</span>
        </footer>
      </div>

      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title="Importar datos">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-xs text-white/50">Pega aquí el JSON exportado, o elige un archivo.</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="{ ... }"
            className="h-40 w-full rounded-xl bg-white/10 p-3 font-mono text-xs text-white outline-none focus:ring-2 focus:ring-teal"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFilePick}
            className="hidden"
          />
          <Button variant="secondary" block onClick={() => fileInputRef.current?.click()}>
            Elegir archivo…
          </Button>
          <Button block disabled={!importText.trim()} onClick={handleImport}>
            <IconCheck size={18} /> Importar
          </Button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="¿Borrar todos los datos?">
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-sm text-white/60">
            Esta acción elimina tu historial, plan, revisiones y logros de este dispositivo. No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" block onClick={handleReset}>
              Borrar todo
            </Button>
          </div>
        </div>
      </Sheet>
    </Screen>
  )
}
