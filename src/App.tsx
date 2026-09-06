import { useEffect } from 'react'
import { ToastProvider } from './components/Toast'
import { TabBar } from './components/TabBar'
import { useNav } from './lib/nav'
import type { Screen } from './lib/types'
import Today from './screens/Today'
import Walk, { hasActiveWalk } from './screens/Walk'
import Strength from './screens/Strength'
import Nutrition from './screens/Nutrition'
import Supplements from './screens/Supplements'
import Progress from './screens/Progress'
import WeeklyReview from './screens/WeeklyReview'
import Settings from './screens/Settings'

// Pantallas "hijas" a las que se llega desde Hoy/Progreso: sin tab bar, con botón atrás.
const CHILD_SCREENS: Screen[] = ['walk', 'strength', 'review']

function renderScreen(screen: Screen) {
  switch (screen) {
    case 'today':
      return <Today />
    case 'walk':
      return <Walk />
    case 'strength':
      return <Strength />
    case 'nutrition':
      return <Nutrition />
    case 'supplements':
      return <Supplements />
    case 'progress':
      return <Progress />
    case 'review':
      return <WeeklyReview />
    case 'settings':
      return <Settings />
  }
}

export default function App() {
  const screen = useNav((s) => s.screen)
  const go = useNav((s) => s.go)
  const isChild = CHILD_SCREENS.includes(screen)

  // Si la app se recargó (o se cerró) con una caminata en curso, volvemos a ella
  // para no perder el cronómetro.
  useEffect(() => {
    if (hasActiveWalk()) go('walk')
  }, [go])

  return (
    <ToastProvider>
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-navy-deep text-white">
        <div className="min-h-0 flex-1">{renderScreen(screen)}</div>
        {!isChild && <TabBar />}
      </div>
    </ToastProvider>
  )
}
