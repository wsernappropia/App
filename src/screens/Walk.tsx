import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconWalk } from '../components/icons'
import { useNav } from '../lib/nav'

export default function Walk() {
  const back = useNav((s) => s.back)
  return (
    <Screen title="Caminata" back onBack={back}>
      <EmptyState
        icon={<IconWalk size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirá el timer de caminata."
      />
    </Screen>
  )
}
