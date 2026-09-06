import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconDumbbell } from '../components/icons'
import { useNav } from '../lib/nav'

export default function Strength() {
  const back = useNav((s) => s.back)
  return (
    <Screen title="Fuerza" back onBack={back}>
      <EmptyState
        icon={<IconDumbbell size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirá el circuito de fuerza por rondas."
      />
    </Screen>
  )
}
