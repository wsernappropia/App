import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconHome } from '../components/icons'

export default function Today() {
  return (
    <Screen title="Hoy">
      <EmptyState
        icon={<IconHome size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirá tu misión del día, el Día Mínimo y tu racha."
      />
    </Screen>
  )
}
