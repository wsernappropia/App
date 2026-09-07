// Capa nativa de los recordatorios (Capacitor + @capacitor/local-notifications).
//
// Todo lo que hay aquí es un no-op en la web: `Capacitor.isNativePlatform()` es
// false y el plugin ni siquiera se importa (import dinámico), así que el bundle
// de la PWA no crece ni se rompe. La lógica de QUÉ programar vive en
// `reminders.ts` (puro y testeado); aquí sólo se traduce a llamadas del plugin.
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import type { ActionPerformed, LocalNotificationSchema } from '@capacitor/local-notifications'
import { useNav } from './nav'
import { useStore } from './store'
import {
  REMINDER_SCREEN,
  TEST_NOTIFICATION_ID,
  isPlannedReminderId,
  isReminderId,
  planReminders,
} from './reminders'
import type { MomentumData } from './types'

/** Canal de Android. Importancia 3 (default): aviso con sonido, sin heads-up intrusivo. */
export const CHANNEL_ID = 'recordatorios'
export const CHANNEL_NAME = 'Recordatorios'
const CHANNEL_IMPORTANCE = 3

/** Icono monocromo de la barra de estado (android/app/src/main/res/drawable). */
export const SMALL_ICON = 'ic_stat_momentum'
const ICON_COLOR = '#14b8a6'

/** Ventana de agrupación de resincronizaciones. */
export const SYNC_DEBOUNCE_MS = 1000

type Plugin = typeof import('@capacitor/local-notifications').LocalNotifications

export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

let pluginPromise: Promise<Plugin | null> | null = null

/** Carga perezosa del plugin. Devuelve null en web o si el import falla. */
async function loadPlugin(): Promise<Plugin | null> {
  if (!isNative()) return null
  if (!pluginPromise) {
    pluginPromise = import('@capacitor/local-notifications')
      .then((m) => m.LocalNotifications)
      .catch((err) => {
        console.error('[reminders] no se pudo cargar el plugin', err)
        return null
      })
  }
  return pluginPromise
}

let channelReady: Promise<void> | null = null

async function ensureChannel(ln: Plugin): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return
  if (!channelReady) {
    channelReady = ln
      .createChannel({
        id: CHANNEL_ID,
        name: CHANNEL_NAME,
        description: 'Avisos para completar tu Día Mínimo',
        importance: CHANNEL_IMPORTANCE,
        visibility: 1,
        lights: false,
        vibration: true,
      })
      .catch((err) => {
        console.error('[reminders] no se pudo crear el canal', err)
      })
  }
  return channelReady
}

// -------------------------------------------------------------- permisos

/** ¿Está concedido el permiso de notificaciones? */
export async function hasPermission(): Promise<boolean> {
  const ln = await loadPlugin()
  if (!ln) return false
  try {
    const status = await ln.checkPermissions()
    return status.display === 'granted'
  } catch {
    return false
  }
}

/**
 * Pide el permiso de notificaciones (Android 13+ muestra el diálogo del sistema).
 * Devuelve false en la web y si la persona lo deniega.
 */
export async function requestPermission(): Promise<boolean> {
  const ln = await loadPlugin()
  if (!ln) return false
  try {
    const current = await ln.checkPermissions()
    if (current.display === 'granted') return true
    const asked = await ln.requestPermissions()
    return asked.display === 'granted'
  } catch (err) {
    console.error('[reminders] fallo al pedir permiso', err)
    return false
  }
}

// ----------------------------------------------------------- programación

/**
 * Cancela las notificaciones ya programadas por nosotros.
 * Sólo toca los ids del rango de `planReminders`, así que una notificación de
 * prueba recién lanzada no se lleva por delante.
 */
async function cancelPlanned(ln: Plugin): Promise<void> {
  const pending = await ln.getPending()
  const ids = pending.notifications
    .map((n) => n.id)
    .filter((id) => isPlannedReminderId(id))
    .map((id) => ({ id }))
  if (ids.length > 0) await ln.cancel({ notifications: ids })
}

/**
 * Reprograma los recordatorios de los próximos 7 días.
 *
 * Nota sobre alarmas: se usan alarmas INEXACTAS (`isExactNotification: false`)
 * con `allowWhileIdle`. Con `targetSdk 36`, Android no concede
 * `SCHEDULE_EXACT_ALARM` automáticamente y pedirlo abriría una pantalla de
 * ajustes del sistema; a cambio, el aviso puede llegar con unos minutos de
 * desfase, algo irrelevante para un recordatorio de hábitos.
 *
 * Devuelve cuántas notificaciones quedaron programadas.
 */
export async function syncReminders(
  state: MomentumData = useStore.getState(),
  now: Date = new Date(),
): Promise<number> {
  const ln = await loadPlugin()
  if (!ln) return 0
  try {
    await ensureChannel(ln)
    await cancelPlanned(ln)

    const settings = state.settings.reminders
    if (!settings.enabled) return 0
    if (!(await hasPermission())) return 0

    const planned = planReminders(state, settings, now)
    if (planned.length === 0) return 0

    await ln.schedule({
      notifications: planned.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        channelId: CHANNEL_ID,
        smallIcon: SMALL_ICON,
        iconColor: ICON_COLOR,
        autoCancel: true,
        isExactNotification: false,
        extra: { reminder: p.reminder, date: p.date },
        schedule: { at: p.at, allowWhileIdle: true },
      })),
    })
    return planned.length
  } catch (err) {
    console.error('[reminders] no se pudieron programar', err)
    return 0
  }
}

/** Cancela todo lo planificado (al apagar el interruptor maestro). */
export async function cancelAllReminders(): Promise<void> {
  const ln = await loadPlugin()
  if (!ln) return
  try {
    await cancelPlanned(ln)
  } catch (err) {
    console.error('[reminders] no se pudieron cancelar', err)
  }
}

/** Notificación de prueba dentro de 5 segundos. */
export const TEST_DELAY_MS = 5000

export async function sendTestNotification(): Promise<boolean> {
  const ln = await loadPlugin()
  if (!ln) return false
  try {
    await ensureChannel(ln)
    await ln.schedule({
      notifications: [
        {
          id: TEST_NOTIFICATION_ID,
          title: 'Momentum',
          body: 'Así se verán tus recordatorios. 5 minutos mantienen el ritmo.',
          channelId: CHANNEL_ID,
          smallIcon: SMALL_ICON,
          iconColor: ICON_COLOR,
          autoCancel: true,
          isExactNotification: false,
          extra: { reminder: 'mission' },
          schedule: { at: new Date(Date.now() + TEST_DELAY_MS), allowWhileIdle: true },
        },
      ],
    })
    return true
  } catch (err) {
    console.error('[reminders] fallo en la notificación de prueba', err)
    return false
  }
}

// ------------------------------------------------------------------ toque

/** Al tocar una notificación, abrimos la pantalla que corresponde. */
export function openScreenFor(notification: LocalNotificationSchema | undefined): void {
  const extra = notification?.extra as { reminder?: unknown } | undefined
  const id = extra?.reminder
  useNav.getState().go(isReminderId(id) ? REMINDER_SCREEN[id] : 'today')
}

// ------------------------------------------------------------------- hook

/**
 * Mantiene las notificaciones en sintonía con el estado.
 *
 * Resincroniza (con debounce de 1 s):
 *  - al arrancar la app,
 *  - cada vez que cambia el store (misión hecha, proteína añadida, ajustes…),
 *  - al volver la app a primer plano (`appStateChange` de @capacitor/app, y
 *    `visibilitychange` como red de seguridad).
 *
 * En la web no hace absolutamente nada.
 */
export function useReminderSync(): void {
  useEffect(() => {
    if (!isNative()) return

    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const handles: PluginListenerHandle[] = []

    const requestSync = () => {
      if (disposed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (!disposed) void syncReminders(useStore.getState())
      }, SYNC_DEBOUNCE_MS)
    }

    // Arranque + cualquier cambio del store.
    requestSync()
    const unsubscribe = useStore.subscribe(requestSync)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') requestSync()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const track = (handle: PluginListenerHandle) => {
      if (disposed) void handle.remove()
      else handles.push(handle)
    }

    void (async () => {
      try {
        const { App } = await import('@capacitor/app')
        track(
          await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) requestSync()
          }),
        )
      } catch (err) {
        console.error('[reminders] sin appStateChange', err)
      }
      const ln = await loadPlugin()
      if (!ln) return
      try {
        track(
          await ln.addListener('localNotificationActionPerformed', (action: ActionPerformed) => {
            openScreenFor(action.notification)
          }),
        )
      } catch (err) {
        console.error('[reminders] sin listener de toque', err)
      }
    })()

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      for (const h of handles) void h.remove()
    }
  }, [])
}
