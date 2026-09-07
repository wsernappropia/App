import { useEffect, useRef, useState } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Stepper } from '../components/Stepper'
import { Sheet } from '../components/Sheet'
import { Toggle } from '../components/Toggle'
import { DiagnosticsCard } from '../components/DiagnosticsCard'
import { useToast } from '../components/Toast'
import { IconBell, IconCheck, IconPill, IconWalk } from '../components/icons'
import { useStore } from '../lib/store'
import { useNav } from '../lib/nav'
import { ALL_SUPPLEMENTS } from '../lib/supplements'
import { DAY_SHORT } from '../lib/dates'
import { REMINDER_HINT, REMINDER_LABEL, REMINDER_ORDER, isReminderTime } from '../lib/reminders'
import {
  cancelAllReminders,
  hasPermission,
  isNative,
  requestPermission,
  sendTestNotification,
} from '../lib/notifications'
import {
  HEALTH_SYNC_DAYS,
  STEPS_GOAL_MAX,
  STEPS_GOAL_MIN,
  STEPS_GOAL_STEP,
  formatSyncAge,
} from '../lib/health'
import {
  availabilityDetail as healthAvailability,
  isNativeHealth,
  requestPermissions as requestHealthPermissions,
  syncHealth,
} from '../lib/healthConnect'
import { errorMessage } from '../lib/diagnostics'
import type { ReminderConfig, ReminderId, SupplementId } from '../lib/types'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // lunes..domingo

export default function Settings() {
  const state = useStore()
  const { settings } = state
  const { show } = useToast()
  const go = useNav((s) => s.go)

  const [resetOpen, setResetOpen] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const native = isNative()
  const reminders = settings.reminders
  const health = settings.health
  const nativeHealth = isNativeHealth()
  const [healthError, setHealthError] = useState<string | null>(null)
  const [healthBusy, setHealthBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [exportText, setExportText] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Si el permiso se revocó desde los ajustes de Android, lo reflejamos aquí.
  useEffect(() => {
    if (!native || !reminders.enabled) return
    let alive = true
    void hasPermission().then((ok) => {
      if (alive) setPermissionDenied(!ok)
    })
    return () => {
      alive = false
    }
  }, [native, reminders.enabled])

  function patchReminder(id: ReminderId, patch: Partial<ReminderConfig>) {
    state.updateSettings({ reminders: { ...reminders, [id]: { ...reminders[id], ...patch } } })
  }

  async function toggleReminders(next: boolean) {
    if (!next) {
      state.updateSettings({ reminders: { ...reminders, enabled: false } })
      setPermissionDenied(false)
      void cancelAllReminders()
      return
    }
    try {
      const result = await requestPermission()
      if (!result.granted) {
        // El interruptor se queda apagado: sin permiso no hay nada que programar.
        setPermissionDenied(true)
        show(
          result.reason === 'denied'
            ? 'Android denegó el permiso de notificaciones'
            : `No se pudo activar: ${result.error ?? result.reason}`,
        )
        return
      }
      setPermissionDenied(false)
      state.updateSettings({ reminders: { ...reminders, enabled: true } })
    } catch (err) {
      setPermissionDenied(true)
      show(`No se pudo activar: ${errorMessage(err)}`)
    }
  }

  function patchHealth(patch: Partial<typeof health>) {
    state.updateSettings({ health: { ...health, ...patch } })
  }

  async function toggleHealth(next: boolean) {
    if (!next) {
      patchHealth({ enabled: false })
      setHealthError(null)
      return
    }
    setHealthBusy(true)
    try {
      const availability = await healthAvailability()
      if (!availability.available) {
        const detail = availability.reason ?? availability.error
        setHealthError(
          `Health Connect no está disponible en este teléfono.${detail ? ` (${detail})` : ''}`,
        )
        show(detail ? `Health Connect no disponible: ${detail}` : 'Health Connect no disponible')
        return
      }
      const permissions = await requestHealthPermissions()
      if (!permissions.granted) {
        setHealthError(
          permissions.reason === 'error'
            ? `Health Connect falló al pedir permisos: ${permissions.error ?? 'error desconocido'}`
            : 'No diste permiso a Momentum para leer tus datos. Puedes concederlo en Ajustes de Android → Salud y bienestar → Health Connect.',
        )
        show(
          permissions.reason === 'error'
            ? `No se pudo activar: ${permissions.error ?? 'error desconocido'}`
            : 'Health Connect no concedió los permisos',
        )
        return
      }
      setHealthError(null)
      patchHealth({ enabled: true })
      // Primera sincronización inmediata, sin esperar al throttle.
      void syncHealth(true)
    } catch (err) {
      const message = errorMessage(err)
      setHealthError(`No se pudo activar la sincronización: ${message}`)
      show(`No se pudo activar: ${message}`)
    } finally {
      setHealthBusy(false)
    }
  }

  async function handleSyncNow() {
    setHealthBusy(true)
    try {
      const ok = await syncHealth(true)
      show(ok ? 'Datos actualizados' : 'No se pudo sincronizar')
    } finally {
      setHealthBusy(false)
    }
  }

  async function handleTestNotification() {
    const ok = await sendTestNotification()
    show(ok ? 'Te llegará en 5 segundos' : 'No se pudo programar')
  }

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
          <div className="mb-3 flex items-center gap-2">
            <IconBell size={18} className="text-white/60" />
            <p className="text-sm font-extrabold text-white">Recordatorios</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Avisarme durante el día</p>
              <p className="text-xs text-white/45">
                {native
                  ? 'Notificaciones en el móvil para completar tu Día Mínimo'
                  : 'Los recordatorios funcionan en la app Android'}
              </p>
            </div>
            <Toggle
              checked={reminders.enabled}
              disabled={!native}
              onChange={(v) => void toggleReminders(v)}
              label="Activar recordatorios"
            />
          </div>

          {!native && (
            <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/50">
              Esta es la versión web. Instala el APK de Momentum en Android para recibir
              recordatorios: aquí los controles están desactivados.
            </p>
          )}

          {native && permissionDenied && (
            <p className="mt-3 rounded-xl bg-red/15 p-3 text-xs leading-relaxed text-red">
              Android no ha dado permiso para notificaciones. Actívalo en{' '}
              <span className="font-bold">Ajustes → Aplicaciones → Momentum → Notificaciones</span> y
              vuelve a encender este interruptor.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-4 border-t border-white/5 pt-4">
            {REMINDER_ORDER.map((id) => {
              const config = reminders[id]
              const disabled = !native || !reminders.enabled
              return (
                <div key={id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`text-sm font-bold ${disabled ? 'text-white/35' : 'text-white'}`}
                    >
                      {REMINDER_LABEL[id]}
                    </p>
                    <Toggle
                      checked={config.on}
                      disabled={disabled}
                      onChange={(v) => patchReminder(id, { on: v })}
                      label={`Activar ${REMINDER_LABEL[id]}`}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 text-xs leading-snug text-white/40">
                      {REMINDER_HINT[id]}
                    </p>
                    <input
                      type="time"
                      lang="es-ES"
                      value={config.time}
                      disabled={disabled || !config.on}
                      aria-label={`Hora de ${REMINDER_LABEL[id]}`}
                      onChange={(e) => {
                        if (isReminderTime(e.target.value)) {
                          patchReminder(id, { time: e.target.value })
                        }
                      }}
                      className="h-11 min-w-[112px] shrink-0 rounded-xl bg-navy-light px-3 text-center text-base font-bold text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-teal disabled:opacity-40"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {native && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <Button variant="secondary" block onClick={() => void handleTestNotification()}>
                Probar notificación
              </Button>
              <p className="mt-2 text-xs text-white/40">
                Llega en 5 segundos. Android puede retrasar los avisos unos minutos para ahorrar
                batería.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <IconWalk size={18} className="text-white/60" />
            <p className="text-sm font-extrabold text-white">Samsung Health / Health Connect</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Sincronizar actividad</p>
              <p className="text-xs text-white/45">
                {nativeHealth
                  ? 'Trae tus caminatas, pasos y peso desde Health Connect'
                  : 'La sincronización funciona en la app Android'}
              </p>
            </div>
            <Toggle
              checked={health.enabled}
              disabled={!nativeHealth || healthBusy}
              onChange={(v) => void toggleHealth(v)}
              label="Activar sincronización con Health Connect"
            />
          </div>

          <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/50">
            Momentum lee de los últimos {HEALTH_SYNC_DAYS} días: <b>pasos</b> del día,{' '}
            <b>caminatas y senderismo</b> (5 min o más), <b>pulso</b> de esas sesiones y tu{' '}
            <b>último peso</b>. Nada sale de tu teléfono y Momentum nunca escribe en Health
            Connect. Las caminatas que ya registraste a mano no se duplican.
          </p>

          {!nativeHealth && (
            <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/50">
              Esta es la versión web. Instala el APK de Momentum en Android para sincronizar con
              Samsung Health: aquí los controles están desactivados.
            </p>
          )}

          {nativeHealth && healthError && (
            <p className="mt-3 rounded-xl bg-red/15 p-3 text-xs leading-relaxed text-red">
              {healthError}
            </p>
          )}

          {nativeHealth && health.enabled && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="mb-2 text-xs text-white/45">
                Última sincronización: {formatSyncAge(health.lastSyncAt)}
              </p>
              <Button
                variant="secondary"
                block
                disabled={healthBusy}
                onClick={() => void handleSyncNow()}
              >
                Sincronizar ahora
              </Button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold ${health.enabled ? 'text-white' : 'text-white/35'}`}
                >
                  Misión de pasos
                </p>
                <p className="text-xs leading-snug text-white/40">
                  Llegar a la meta cuenta como movimiento del Día Mínimo y mantiene la racha.
                </p>
              </div>
              <Toggle
                checked={health.stepsMissionEnabled}
                disabled={!nativeHealth || !health.enabled}
                onChange={(v) => patchHealth({ stepsMissionEnabled: v })}
                label="Activar misión de pasos"
              />
            </div>
            <Stepper
              label="Meta de pasos"
              value={health.stepsGoal}
              min={STEPS_GOAL_MIN}
              max={STEPS_GOAL_MAX}
              step={STEPS_GOAL_STEP}
              onChange={(v) => patchHealth({ stepsGoal: v })}
            />
          </div>
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

        <DiagnosticsCard onToast={show} />

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
