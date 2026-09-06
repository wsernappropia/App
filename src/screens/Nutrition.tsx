import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconUtensils } from '../components/icons'

export default function Nutrition() {
  return (
    <Screen title="Nutrición">
      <EmptyState
        icon={<IconUtensils size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirá el contador de proteína y los presets."
      />
    </Screen>
  )
}
