import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconPill } from '../components/icons'

export default function Supplements() {
  return (
    <Screen title="Suplementos">
      <EmptyState
        icon={<IconPill size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirá tu checklist de suplementos e historial."
      />
    </Screen>
  )
}
