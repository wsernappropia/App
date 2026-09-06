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

Pasos para activarlo (una sola vez):

1. En GitHub, entra al repositorio y ve a **Settings → Pages**.
2. En **Build and deployment → Source**, elige **"GitHub Actions"**.
3. Haz merge de esta rama a `main` (o ve a la pestaña **Actions → Deploy a GitHub Pages → Run workflow** para lanzarlo manualmente sin esperar al merge).
4. Espera a que el workflow termine (pestaña **Actions**). Cuando esté en verde, la app queda disponible en:

   **https://wsernappropia.github.io/App/**

Cada push posterior a `main` vuelve a desplegar automáticamente la última versión.

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

## Estructura de carpetas

```
.
├── public/                  Iconos y assets estáticos de la PWA
├── src/
│   ├── components/          Componentes de interfaz reutilizables (botones, tarjetas, gráficas, etc.)
│   ├── screens/             Pantallas de la app (Hoy, Caminata, Fuerza, Nutrición, Suplementos, Progreso, Revisión semanal, Ajustes)
│   ├── lib/                 Lógica de negocio: estado (store), progresión (regla 7.1), gamificación, fechas, tipos
│   ├── App.tsx               Componente raíz y navegación
│   ├── main.tsx               Punto de entrada
│   └── index.css               Estilos globales (Tailwind)
├── vite.config.ts            Configuración de Vite, PWA y base de despliegue
└── .github/workflows/deploy.yml   Workflow de compilación y publicación en GitHub Pages
```
