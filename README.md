# Momentum

Momentum es una PWA personal para construir hábitos de actividad física de forma progresiva y gamificada.

La filosofía es simple: **"5 minutos mantienen el ritmo"** — no hace falta un entrenamiento perfecto todos los días, basta con una dosis mínima para conservar la racha. Y algo igual de importante: **no hay deuda**. Un día sin actividad no se "arrastra" ni hay que compensarlo después; cada día empieza limpio.

## Funciones

- **Hoy**: la pantalla principal, con las tareas del día (caminata, fuerza, suplementos) y el estado de la racha.
- **Caminata**: registro de sesiones de caminata con duración.
- **Fuerza**: rutina de fuerza por rondas y repeticiones, con RPE (esfuerzo percibido) y dolor.
- **Nutrición**: seguimiento de hábitos nutricionales del día.
- **Suplementos**: checklist diario de suplementos.
- **Progreso**: gráficas y estadísticas de evolución (XP, adherencia, tendencias).
- **Recordatorios** (sólo app Android): avisos locales durante el día para no olvidar la misión, la proteína, el check-in y la revisión semanal. Ver [Recordatorios](#recordatorios).
- **Samsung Health / Health Connect** (sólo app Android): trae solas las caminatas del reloj, los pasos del día y el peso. Ver [Samsung Health / Health Connect](#samsung-health--health-connect).
- **Revisión semanal**: al cierre de cada semana, la app aplica la **regla 7.1** para decidir cómo ajustar el plan de la próxima semana según adherencia, RPE y dolor:

  | Adherencia | RPE / dolor | Decisión |
  |---|---|---|
  | < 50% | (cualquiera) | **Reducir** — el plan vuelve a la dosis base |
  | 50–79% | RPE ≤ 7 y dolor ≤ 3 | **Repetir** — mismo plan la próxima semana |
  | 50–79% | RPE ≥ 8 o dolor > 3 | **Mantener** — sin cambios |
  | ≥ 80% | RPE ≤ 7 y dolor ≤ 2 | **Progresar** — sube una variable (caminata → repeticiones → rondas, en ciclo) |
  | ≥ 80% | RPE ≥ 8 o dolor > 2 | **Mantener** — nunca se progresa si hay dolor |

### Gamificación

- **XP**: se gana por cada sesión de caminata, fuerza y por completar la revisión semanal.
- **Niveles**: el XP acumulado determina el nivel del plan y su nombre.
- **Racha con escudos**: mantener la actividad día a día construye una racha. Cada 7 días de racha se gana un escudo (máximo 2 acumulados) que protege la racha si se falla un día.
- **Insignias**: logros desbloqueables por hitos (por ejemplo, mantener una racha de 7 días).

## Recordatorios

La app Android puede avisarte a lo largo del día para que completes tus metas. Son **notificaciones locales**: se programan en el propio móvil, sin servidor y sin conexión.

Hay cuatro recordatorios, cada uno con su hora:

| Recordatorio | Hora por defecto | Cuándo |
|---|---|---|
| Misión del día | 08:00 | Todos los días (en el día de descanso, se convierte en "caminata opcional") |
| Proteína | 14:00 | Todos los días |
| Check-in | 21:00 | Todos los días |
| Revisión semanal | 18:00 | Sólo los domingos |

**Cómo activarlos:** *Ajustes → Recordatorios → "Avisarme durante el día"*. Al encenderlo, Android pide el permiso de notificaciones (Android 13+). Si lo deniegas, el interruptor se queda apagado y la app te explica cómo concederlo después: *Ajustes de Android → Aplicaciones → Momentum → Notificaciones*. Desde ahí puedes encender o apagar cada recordatorio por separado y cambiar su hora. El botón **"Probar notificación"** lanza una de ejemplo a los 5 segundos.

**Son inteligentes, no repetitivos.** Se reprograman solos (los próximos 7 días) cada vez que cambias algo, y omiten lo que ya no hace falta: si hoy ya hiciste la misión, no te avisa de la misión; si ya llegaste al mínimo de proteína, no te avisa de proteína; si ya hiciste el check-in, tampoco. El aviso de la misión usa el plan real de ese día (caminar N minutos, o N rondas de fuerza).

**Pueden llegar con unos minutos de desfase.** Momentum usa alarmas *inexactas* a propósito: las exactas exigen un permiso especial en Android 12+ que obligaría a mandarte a una pantalla de ajustes del sistema, y para un recordatorio de hábitos no compensa. A cambio, Android agrupa los avisos para ahorrar batería, así que uno de las 08:00 puede sonar a las 08:05. El ahorro de batería agresivo del fabricante (Xiaomi, Huawei, Samsung…) puede retrasarlos más: si te pasa, quita a Momentum de la optimización de batería.

**Sólo existen en la app Android.** En la web (PWA o navegador) la sección aparece con los controles desactivados y una nota: no hay recordatorios ahí.

## Samsung Health / Health Connect

*(Sólo en la app Android.)* Momentum puede **leer** tu actividad de **Health Connect**, que es donde Samsung Health (y con él el Galaxy Watch) deja sus datos. Así no hace falta apuntar a mano una caminata que el reloj ya registró.

### Qué se sincroniza

| Dato | Para qué |
|---|---|
| **Pasos del día** (y de los últimos 7 días) | Tarjeta "Pasos" en Hoy, media semanal en Progreso y, opcionalmente, la misión de pasos |
| **Caminatas y senderismo** de 5 min o más | Se registran como caminatas normales, con su XP de siempre (2 XP/min + bonus diario) |
| **Distancia** de esas sesiones | Estimar el ritmo: < 4 km/h suave, < 5,5 km/h moderado, más rápido |
| **Pulso** durante esas sesiones | Pulsaciones medias de la sesión en Progreso |
| **Último peso** medido en los últimos 7 días | Se guarda en el día en que se midió (gráfico de peso en Progreso) |

Momentum **sólo lee**: nunca escribe nada en Health Connect y no toca sueño, nutrición ni ningún otro tipo de dato. Todo se queda en el teléfono, como el resto de la app.

### Pasos en el teléfono (una sola vez)

1. **Samsung Health → Ajustes → Health Connect** y activa el envío de **Pasos**, **Ejercicio**, **Frecuencia cardíaca** y **Peso** hacia Health Connect. (En **Android 14 o superior**, Health Connect ya viene en el sistema: *Ajustes de Android → Salud y bienestar → Health Connect*. En Android 13 o anterior es una app aparte que se instala desde Play Store.)
2. Instala el APK nuevo de Momentum.
3. En Momentum: **Ajustes → Samsung Health / Health Connect → "Sincronizar actividad"**. Al encenderlo, Health Connect muestra su propio diálogo con los cinco permisos que pide Momentum (pasos, ejercicio, distancia, pulso, peso). Concédelos.
4. Nada que hacer en el reloj: sigue sincronizando con Samsung Health como siempre.

Si el teléfono no tiene Health Connect, el interruptor se queda apagado y la app avisa ("Health Connect no está disponible en este teléfono"). Si deniegas los permisos, también se queda apagado y te dice dónde concederlos después.

### Cuándo sincroniza

Al abrir la app y cada vez que vuelve a primer plano, con un margen de **5 minutos** entre sincronizaciones para no machacar la batería. También hay un botón **"Sincronizar ahora"** en Ajustes, y debajo se ve cuándo fue la última ("hace 4 min"). Si algo falla (permiso revocado, Health Connect apagado), la sincronización se rinde en silencio: **la app nunca se rompe por esto** y el modo manual sigue igual.

### Qué pasa con las caminatas que ya registraste a mano

No se duplican. Al insertar una sesión de Health Connect, Momentum descarta:

- las de **menos de 5 minutos** (el mismo umbral del modo manual),
- las que **ya están** (se guarda el id del registro de Health Connect en la sesión),
- las que **solapan un 50 % o más** con una caminata que registraste tú a mano — se entiende que son la misma salida. El solape se mide sobre la más corta de las dos, así que una caminata manual de 10 min dentro de una sesión del reloj de 30 min cuenta como la misma.

Las que sí entran se marcan con la etiqueta **"Desde Samsung Health"** en Progreso, y en Hoy la tarjeta de misión cumplida indica cuántos minutos vinieron del reloj.

### Misión de pasos (opcional)

Está **apagada por defecto**: activarla es lo único que cambia las reglas del juego. Con **Ajustes → "Misión de pasos"** encendida, llegar a la meta diaria (entre 5.000 y 15.000 pasos, 8.000 por defecto) cuenta como **movimiento del Día Mínimo** y **mantiene la racha**, aunque no hayas registrado ninguna caminata. Da además un bonus de **15 XP** una sola vez al día. El resto de tarifas de XP no cambia.

Con la misión apagada, los pasos son sólo información: se ven en Hoy y en Progreso, y no afectan a rachas ni a XP.

### Límites y letra pequeña

- **30 días de historial.** Health Connect sólo deja leer los últimos 30 días sin un permiso extra (`READ_HEALTH_DATA_HISTORY`) que Momentum **no** pide. En la práctica da igual: sincroniza los **últimos 7 días** en cada arranque.
- **El reloj necesita el móvil.** Samsung Health sube al teléfono por Bluetooth; si el reloj lleva días sin emparejarse, esos datos aún no están en Health Connect.
- **Android 8 (API 26) como mínimo** — es lo que exige el SDK de Health Connect, así que la app subió su `minSdkVersion` de 24 a 26. Para *usar* Health Connect de verdad hace falta Android 9 o superior.
- **No hace falta ninguna aprobación de Google.** El formulario de declaración de datos de salud es un requisito de la **Play Console**, y Momentum se instala por APK desde GitHub Releases: nunca pasa por ahí. Basta con declarar los permisos en el manifest y que tú los concedas en el diálogo del sistema, igual que la cámara o la ubicación.

## Stack técnico

- [Vite 8](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Zustand](https://zustand.docs.pmnd.rs/) para el estado de la aplicación
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox) para convertirla en PWA instalable con soporte offline
- [Vitest](https://vitest.dev/) para pruebas unitarias

## Cómo correr en local

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo (http://localhost:5173)
npm test          # pruebas unitarias
npm run build     # compilación de producción (carpeta dist/)
```

## Publicar en GitHub Pages

El repositorio incluye un workflow (`.github/workflows/deploy.yml`) que compila y publica la app automáticamente en GitHub Pages con cada cambio en `main`, o cuando se lanza manualmente.

El propio workflow activa GitHub Pages la primera vez que se ejecuta: el paso `actions/configure-pages@v5` usa `enablement: true`, así que configura Pages con fuente **"GitHub Actions"** automáticamente si aún no estaba activado. No hace falta tocar nada en Settings salvo que ese paso falle.

Pasos para activarlo (una sola vez):

1. Haz merge de esta rama a `main` (o ve a la pestaña **Actions → Deploy a GitHub Pages → Run workflow** para lanzarlo manualmente sin esperar al merge).
2. Espera a que el workflow termine (pestaña **Actions**). Cuando esté en verde, la app queda disponible en:

   **https://wsernappropia.github.io/App/**

Cada push posterior a `main` vuelve a desplegar automáticamente la última versión.

**Fallback manual:** si el workflow sigue fallando en el paso `configure-pages` con un error tipo "Not Found" o de permisos (por ejemplo, si Pages está deshabilitado a nivel de organización o el token no tiene permisos suficientes), actívalo manualmente: ve a **Settings → Pages**, en **Build and deployment → Source** elige **"GitHub Actions"**, guarda y vuelve a lanzar el workflow desde **Actions → Deploy a GitHub Pages → Run workflow**.

## Instalar la app en el celular

Momentum funciona como una app instalable (PWA): una vez abierta la URL en el navegador del teléfono, se puede añadir a la pantalla de inicio y se comporta como una app nativa, con icono propio y sin la barra del navegador.

**Android (Chrome)**

1. Abre `https://wsernappropia.github.io/App/` en Chrome.
2. Toca el menú ⋮ (arriba a la derecha).
3. Elige **"Instalar app"** o **"Añadir a pantalla de inicio"**.

**iPhone (Safari)**

1. Abre `https://wsernappropia.github.io/App/` en Safari (tiene que ser Safari; otros navegadores en iOS no permiten instalar PWAs).
2. Toca el botón **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elige **"Añadir a pantalla de inicio"**.

### Sobre los datos

Momentum guarda toda la información **solo en el dispositivo** (no hay servidor ni cuenta): el progreso vive en el almacenamiento local del navegador. Esto significa que:

- Los datos no se sincronizan entre dispositivos por sí solos.
- Borrar los datos del navegador/app, o desinstalarla, borra el progreso.

Para mover el progreso entre dispositivos o hacer una copia de seguridad, usa **Ajustes** dentro de la app:

- **Exportar**: genera un texto (JSON) con todos los datos, que se puede copiar o guardar.
- **Importar**: pega ese texto en un dispositivo distinto (o tras reinstalar) para recuperar el progreso.

## Instalar como app Android (APK)

Además de la PWA, Momentum se empaqueta como **app nativa de Android** con [Capacitor](https://capacitorjs.com/). Es la opción recomendada si no quieres depender de una URL: el APK lleva la app dentro y funciona sin conexión desde el primer arranque.

### Descargar e instalar

1. Desde el móvil, abre la página de **[Releases](../../releases/tag/android-latest)** del repositorio (pestaña **Releases → `android-latest`**, "Momentum Android (última build)").
2. Descarga el archivo `momentum-0.1.x.apk` (donde `x` es el número de build).
3. Chrome avisará de que este tipo de archivo puede ser dañino: acepta la descarga.
4. Al abrir el APK, Android pedirá permiso para **instalar apps de orígenes desconocidos**. Concédeselo a Chrome (o al gestor de archivos que uses): *Ajustes → Apps → Chrome → Instalar apps desconocidas → Permitir*. Solo hay que hacerlo la primera vez.
5. Pulsa **Instalar**. Momentum aparecerá en el cajón de aplicaciones con su icono propio.

### Actualizar a una versión nueva

Descarga el APK nuevo desde la misma Release e **instálalo encima** del anterior: no hace falta desinstalar y **los datos se conservan** (Android reconoce que es la misma app porque comparte firma y `applicationId`).

El workflow `.github/workflows/android.yml` recompila el APK en cada push a `main` (o a la rama de trabajo) y actualiza siempre la misma Release `android-latest`, así que el enlace de descarga no cambia nunca.

### Sobre la firma (importante)

El keystore de release está **versionado dentro del repositorio** (`android/keystore/momentum.jks`, con las contraseñas en `android/keystore/keystore.properties`). Es una decisión deliberada:

- Así **todas** las builds —las de GitHub Actions y las que compiles en tu portátil— quedan firmadas con la misma clave, que es justo lo que permite instalar una versión encima de otra sin desinstalar ni perder el progreso.
- El precio: cualquiera con acceso al repositorio puede firmar un APK que Android considerará "el mismo Momentum". Es asumible en un **repositorio personal y privado**.

Dos reglas que van con ese trade-off:

- **Nunca subas esta app a Google Play con este keystore.** Play exige una clave de firma que solo controles tú; para eso habría que generar un keystore nuevo y guardarlo fuera del repositorio (por ejemplo, en *Secrets* de GitHub).
- **Si el repositorio pasa a ser público, rota la clave**: borra `android/keystore/`, genera un keystore nuevo con `keytool` y desinstala/reinstala la app en el móvil (la firma nueva no es compatible con la instalada).

### Compilar el APK en local

Necesitas **JDK 21** y el SDK de Android (lo más cómodo es instalar [Android Studio](https://developer.android.com/studio), que trae ambos).

```bash
npm install
npm run android:apk    # compila la web, sincroniza Capacitor y genera el APK de release
```

El APK sale en `android/app/build/outputs/apk/release/app-release.apk`.

También puedes abrir la carpeta `android/` directamente en Android Studio (**File → Open**) y usar *Run* para instalarlo en un móvil conectado por USB, o *Build → Generate Signed Bundle / APK*.

Otros comandos útiles:

```bash
npm run build:android  # solo compila la web y la copia al proyecto Android (cap sync)
npm run icons          # regenera los iconos de la PWA y las fuentes de assets/
```

Los iconos adaptativos (`mipmap-*`) y el splash de Android se generan a partir de `assets/` con [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets), que no es dependencia del repo (usa `sharp`). Si necesitas regenerarlos:

```bash
npm run icons
npx @capacitor/assets generate --android --iconBackgroundColor '#0f2b46' --splashBackgroundColor '#0b1a2b'
```

### ¿Y en iPhone?

Capacitor también soporta iOS, pero generar un `.ipa` instalable exige un Mac con Xcode y una cuenta de desarrollador de Apple (y reinstalar cada 7 días con una cuenta gratuita). Queda fuera de alcance por ahora: en iPhone, la vía práctica sigue siendo **instalar la PWA desde Safari** como se explica más arriba.

## Estructura de carpetas

```
.
├── public/                  Iconos, assets estáticos de la PWA y privacypolicy.html
│                            (la pantalla que Health Connect abre al pedir permisos)
├── assets/                  Imágenes fuente (icono y splash) para los assets de Android
├── android/                 Proyecto nativo de Android generado por Capacitor
├── scripts/make-icons.mjs   Rasterizador del icono (PWA + fuentes de assets/)
├── src/
│   ├── components/          Componentes de interfaz reutilizables (botones, tarjetas, gráficas, etc.)
│   ├── screens/             Pantallas de la app (Hoy, Caminata, Fuerza, Nutrición, Suplementos, Progreso, Revisión semanal, Ajustes)
│   ├── lib/                 Lógica de negocio: estado (store), progresión (regla 7.1), gamificación, fechas, tipos
│   ├── App.tsx               Componente raíz y navegación
│   ├── main.tsx               Punto de entrada
│   └── index.css               Estilos globales (Tailwind)
├── vite.config.ts            Configuración de Vite, PWA y base de despliegue
├── capacitor.config.ts       Configuración de Capacitor (app nativa de Android)
└── .github/workflows/
    ├── deploy.yml            Compilación y publicación en GitHub Pages
    └── android.yml           Compilación del APK y publicación en Releases
```
