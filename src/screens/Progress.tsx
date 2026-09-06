import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconChart } from '../components/icons'

export default function Progress() {
  return (
    <Screen title="Progreso">
      <EmptyState
        icon={<IconChart size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirán tus estadísticas semanales y logros."
      />
    </Screen>
  )
}
