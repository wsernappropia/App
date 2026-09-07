# Momentum + Samsung Health / Health Connect — Investigación (sept. 2026)

## 1. Health Connect en Android

**Integración con el sistema.** Desde **Android 14**, Health Connect dejó de ser una app descargable de Play Store y pasó a ser un **módulo del sistema operativo** (accesible en Ajustes → Salud y bienestar), y esto se mantiene en Android 15/16 [Android Developers](https://developer.android.com/health-and-fitness/health-connect/migration/android-13-to-14). En **Android 13 o inferior** sigue siendo una app aparte instalable desde Play Store [Google Support](https://support.google.com/android/answer/14119325?hl=en). El SDK de Health Connect soporta **API 26+ (Android 8)**, pero la app/módulo de Health Connect requiere **API 28+ (Android 9)** en el dispositivo [Android Developers](https://developer.android.com/health-and-fitness/health-connect/get-started).

**Samsung Health ↔ Health Connect.** Samsung Health sincroniza con Health Connect: pasos, ejercicio/entrenamientos (`ExerciseSession`), sueño, frecuencia cardíaca, calorías y, si se activa, peso y otras métricas corporales — se elige qué tipos compartir dentro de Samsung Health [Samsung Developer](https://developer.samsung.com/health/blog/en/accessing-samsung-health-data-through-health-connect) [Samsung Developer FAQ](https://developer.samsung.com/health/health-connect-faq.html). Google Fit está en proceso de apagado en 2026 y ya no es una vía de sincronización relevante [FitMesh](https://www.fitmesh.fit/en/blog/sync-samsung-health-google-fit).

**Requisitos de manifest para leer datos:**
- `<uses-permission android:name="android.permission.health.READ_STEPS"/>` (y equivalentes para `READ_EXERCISE`, `READ_HEART_RATE`, `READ_WEIGHT`).
- Una **Activity de "rationale"/política de privacidad** con intent-filter `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`, más un `activity-alias` `ViewPermissionUsageActivity` (sin este alias, las solicitudes de permiso fallan silenciosamente) [Android Developers](https://developer.android.com/health-and-fitness/health-connect/get-started) [Eevis Panula](https://eevis.codes/blog/2024-01-12/exploring-health-connect-pt-1-setting-up-permissions/).
- `<queries><package android:name="com.google.android.apps.healthdata"/></queries>` para detectar si Health Connect está instalado/disponible.
- `minSdk` efectivo 26 (SDK) / 28 (para que el usuario pueda usarlo realmente).

**¿Aprobación de Google necesaria para sideload?** El **Developer Declaration Form** y la revisión de tipos de datos son un requisito de **Google Play Console** para publicar en Play Store [Play Console Help](https://support.google.com/googleplay/android-developer/answer/12991134?hl=en). Un APK distribuido fuera de Play (GitHub Releases) **nunca pasa por Play Console**, así que ese trámite **no aplica**: basta con declarar los permisos en el manifest y que el usuario los conceda en el diálogo nativo del sistema, igual que cualquier otro permiso runtime. Es el mismo modelo que cámara/ubicación: la revisión de Google solo se activa al *publicar*.

**Límite de historial (30 días).** Por defecto, cualquier app solo puede leer datos de hasta 30 días antes del momento en que se concedió el permiso. Para leer más atrás se necesita el permiso adicional `PERMISSION_READ_HEALTH_DATA_HISTORY`, que el usuario debe conceder aparte (no requiere aprobación de Google, solo consentimiento en el propio dispositivo) [Android Developers](https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data). Para Momentum (sincronizar "desde que abrí la app por última vez") esto es irrelevante en la práctica.

## 2. Plugins de Capacitor

| Plugin | Estado | Versión/Capacitor | Tipos soportados | Licencia | Notas |
|---|---|---|---|---|---|
| **`@capgo/capacitor-health`** (Cap-go) | Activo, mantenido | v8.x para Capacitor 8 (v7.x soporte "on demand") | Steps, distancia, calorías, **ExerciseSession/workouts**, **HeartRate**, **Weight**, sueño, etc. (~20 tipos), HealthKit + Health Connect | **MPL-2.0**, gratuito | [GitHub](https://github.com/Cap-go/capacitor-health), [npm](https://www.npmjs.com/package/@capgo/capacitor-health) |
| Capawesome `@capawesome/capacitor-health` | Activo | Requiere Capacitor 8+ | Similar cobertura amplia | **De pago** (Capawesome Insiders, requiere registry/licencia) | No apto para proyecto personal sin suscripción [Capawesome](https://capawesome.io/docs/sdks/capacitor/health/) |
| `capacitor-health-connect` (comunidad) | Actividad variable, no verificado a fondo | — | Health Connect únicamente | — | Alternativa de respaldo si Cap-go fallara |

**Recomendación:** `@capgo/capacitor-health` — gratis, MPL-2.0, activamente mantenido y alineado con Capacitor 8, cubre exactamente los 4 tipos que Momentum necesita.

```ts
import { Health, DataType } from '@capgo/capacitor-health'

// Pasos de hoy
async function getTodaySteps() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const { records } = await Health.readRecords({
    dataType: DataType.Steps,
    startDate: start.toISOString(),
    endDate: new Date().toISOString(),
  })
  return records.reduce((sum, r) => sum + r.value, 0)
}

// Sesiones de ejercicio (caminatas) de los últimos 7 días
async function getRecentWalks() {
  const start = new Date(Date.now() - 7 * 86400_000)
  const { workouts } = await Health.readWorkouts({
    startDate: start.toISOString(),
    endDate: new Date().toISOString(),
  })
  return workouts.filter(w => w.type === 'walking' /* o equivalente */)
}
```
(Nombres exactos de tipo/enum a confirmar contra la versión instalada; la API es estable en su forma general `readRecords`/`readWorkouts`.)

## 3. Samsung Health Data SDK (acceso directo)

**No viable para este caso.** Requiere convertirse en **partner aprobado de Samsung** para distribuir la app con acceso a datos reales (en desarrollo se puede probar sin registrar package/firma, pero para uso "real" hace falta aprobación) [Samsung Developer](https://developer.samsung.com/health/data/guide/app-verification.html). Además, **Samsung actualmente no acepta nuevas solicitudes al Partner Apps Program** [Samsung Developer](https://developer.samsung.com/health/android/data/guide/process.html). Migrar del SDK legacy tampoco ayuda: las aprobaciones antiguas no son válidas para el nuevo Data SDK. **Conclusión: descartado** para un desarrollador individual sin publicación — Health Connect es la vía correcta y ya cubre los mismos datos indirectamente.

## 4. App companion en el propio Galaxy Watch (Wear OS)

Implicaría un módulo Wear OS separado usando **Health Services API** (sensores en tiempo real) y **Data Layer API** (Play Services) para transferir datos del reloj al teléfono [Android Developers](https://developer.android.com/training/wearables/data/overview), con build, empaquetado y ciclo de vida propios dentro del mismo proyecto Capacitor/Android (mucho más complejo: dos APKs, dos manifiestos, sincronización manual). **No compensa** frente a Health Connect porque: (a) Samsung Health ya hace ese trabajo de recolección y sincronización de forma nativa; (b) Health Connect da acceso a los mismos datos con una integración mucho más simple (un plugin, sin código nativo Wear OS); (c) el reloj **no sube datos a la nube sin el teléfono** — la sincronización de Samsung Health (y por tanto a Health Connect) depende de la conexión Bluetooth con el móvil, incluso en modelos LTE [Samsung Community](https://us.community.samsung.com/t5/wearables/samsung-health-sync-via-wifi-lte/td-p/14520950). Es decir, ni siquiera ganaríamos independencia del teléfono.

## 5. Alternativas de bajo esfuerzo

- **Exportación manual**: Samsung Health → Ajustes → Descargar datos personales genera un ZIP con ~19 CSV (pasos, peso, sueño, entrenamientos) más JSON detallado [guía](https://medium.com/@dimshik100/how-to-extract-your-personal-samsung-health-data-514bbe2331f7). Sirve para análisis puntual, **no** para sincronización automática (proceso manual, sin API).
- **Tasker/Automate**: existe un plugin de terceros, **TaskerHealthConnect** (RafhaanShah), que expone lectura/escritura de Health Connect como acción de Tasker devolviendo JSON [GitHub](https://github.com/RafhaanShah/TaskerHealthConnect). Podría usarse para exportar pasos a un archivo/webhook que Momentum lea, pero añade una dependencia externa y un intermediario frágil — no aporta nada que el plugin de Capacitor no resuelva de forma nativa.
- **Google Fit**: en apagado durante 2026, descartado como intermediario [FitMesh](https://www.fitmesh.fit/en/blog/sync-samsung-health-google-fit).

## 6. Arquitectura propuesta para Momentum

**Qué leer y cuándo:** al pasar la app a primer plano (`App.addListener('appStateChange')`, ya se usa `@capacitor/app`) o al entrar a `Today`/`Progress`, ejecutar una sincronización silenciosa:
1. `readRecords(Steps, hoy)` → total de pasos del día → mostrar como métrica informativa (no XP directa) o como misión alternativa "8.000 pasos" con su propio badge/XP fijo, sin tocar `walkPerMinute`.
2. `readWorkouts(últimos N días desde última sync)` filtrando tipo caminata/andar y duración ≥ `MIN_WALK_MINUTES` (5 min, constante ya existente en `src/lib/gamification.ts`) → mapear a `WalkSession` (`{ id, startedAt, minutes, pace: 'moderado' }`, `pace` inferido o fijo por defecto) y llamar al mismo `logWalk` de `src/lib/store.ts` que usa el timer manual, preservando las reglas de XP (`walkPerMinute`, `walkBonus` una vez al día) sin duplicar lógica de gamificación.
3. `readRecords(Weight, desde última sync)` → si hay muestra nueva, `setBodyMetrics`/actualizar `DayLog.weight` (campo ya existe en `src/lib/types.ts`).
4. Heart rate: opcional, solo como dato mostrado en el detalle de la sesión (no afecta XP).

**Evitar duplicados:** persistir un `lastSyncedAt` (timestamp) y, por sesión de ejercicio, guardar el `id` externo de Health Connect (o `startedAt` redondeado) en un set local (`localStorage`, o campo `source: 'health-connect' | 'manual'` + `externalId` en `WalkSession`) para no reinsertar la misma sesión ni mezclarla con una caminata ya registrada manualmente en la misma franja horaria (dedupe por solape de intervalo `[startedAt, startedAt+minutes]`).

**Mostrar el origen:** añadir `source?: 'manual' | 'health-connect'` a `WalkSession` y en la UI (`Walk.tsx`/histórico) una etiqueta pequeña "Desde Samsung Health".

**Impacto en gamificación:** ninguna regla nueva de XP; las caminatas detectadas reutilizan `XP.walkPerMinute`/`XP.walkBonus` ya existentes, manteniendo `awards` idempotente por día (mecanismo ya presente en `DayLog.awards`). Los pasos diarios pueden sumar un badge/misión nueva opcional ("8.000 pasos") sin acoplarse al sistema de niveles actual, para no inflar el balance de XP existente.

**Esfuerzo estimado (archivos a tocar):**
- `package.json` / `android` — añadir `@capgo/capacitor-health`, `npx cap sync`.
- `android/app/src/main/AndroidManifest.xml` — permisos health.*, activity-alias de rationale, `<queries>`.
- `android/variables.gradle` — subir `minSdkVersion` de 24 a 26 (Health Connect SDK mínimo).
- Nuevo `src/lib/healthConnect.ts` — wrapper de lectura + dedupe + mapeo a `WalkSession`/`DayLog`.
- `src/lib/store.ts` — función de sync que llama a `logWalk`/actualiza `weight`.
- `src/lib/types.ts` — campo `source`/`externalId` en `WalkSession`.
- `src/screens/Today.tsx` (o donde se dispare al abrir la app) y algún componente de UI para mostrar "Desde Samsung Health" y pasos del día.
- Actividad mínima de "privacy rationale" en Android (puede ser una pantalla simple embebida o reutilizar `PermissionsRationaleActivity` de ejemplo).

**Riesgos:**
- Health Connect no instalado o versión de Android < 9 en el teléfono del usuario (mitigar con detección y fallback silencioso al modo manual).
- Permisos revocados o no concedidos: la app debe seguir funcionando sin health data.
- Cambios de versión del plugin comunitario (`@capgo/capacitor-health`) — pin de versión exacta y test manual tras cada actualización.
- Cambios de nombre/tipo de sesión ("Walking" vs "Caminata") en la clasificación de ejercicio de Samsung Health.

**Pasos que debe hacer el usuario en su teléfono:**
1. Samsung Health → Ajustes → Health Connect (o vía Ajustes del sistema en Android 14+) → activar sincronización de Pasos, Ejercicio, Frecuencia cardíaca y Peso hacia Health Connect.
2. Instalar/actualizar la nueva versión del APK de Momentum (GitHub Releases).
3. Al abrir Momentum, conceder los permisos de Health Connect que solicite (diálogo del sistema, sin fricción de Play Store).
4. Nada adicional en el reloj: sigue sincronizando con Samsung Health como ya hace.

## Tabla comparativa

| Opción | Esfuerzo | Viabilidad (uso personal, sideload) | Datos disponibles |
|---|---|---|---|
| **Health Connect + `@capgo/capacitor-health`** | Medio (1 plugin, manifest, ~6 archivos) | ✅ Alta — sin aprobación de Google necesaria | Pasos, ejercicio, FC, peso, sueño |
| Samsung Health Data SDK directo | Alto | ❌ Bloqueado — partner program cerrado a nuevas solicitudes | Igual o más granular, pero inaccesible |
| App companion Wear OS (Health Services + Data Layer) | Muy alto | ⚠️ Técnicamente posible, pero redundante | Datos en tiempo real, pero requiere el teléfono igual |
| Exportación CSV/ZIP manual | Muy bajo | ✅ Trivial pero manual, no automatizable | Todo, pero sin API ni tiempo real |
| Tasker/Automate + TaskerHealthConnect | Medio-bajo | ⚠️ Viable como puente pero añade dependencia externa | Lo que Health Connect exponga, vía JSON |

**Recomendación final:** integrar **Health Connect** mediante **`@capgo/capacitor-health`** (gratuito, MPL-2.0, mantenido para Capacitor 8), leyendo pasos/ejercicio/peso/FC al abrir la app, convirtiendo sesiones de caminata ≥5 min en `WalkSession` con `source: 'health-connect'` y dedupe por solape horario, sin crear reglas nuevas de XP más allá de una misión opcional de pasos diarios. Es la única vía que combina bajo esfuerzo, cero dependencia de aprobaciones externas y cobertura completa de los 4 tipos de datos pedidos.
