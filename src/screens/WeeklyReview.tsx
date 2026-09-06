import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconChart } from '../components/icons'
import { useNav } from '../lib/nav'

export default function WeeklyReview() {
  const back = useNav((s) => s.back)
  return (
    <Screen title="Revisión semanal" back onBack={back}>
      <EmptyState
        icon={<IconChart size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirá el resumen y la decisión de la próxima semana."
      />
    </Screen>
  )
}
