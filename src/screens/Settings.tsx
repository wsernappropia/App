import { Screen } from '../components/Screen'
import { EmptyState } from '../components/EmptyState'
import { IconSettings } from '../components/icons'

export default function Settings() {
  return (
    <Screen title="Ajustes">
      <EmptyState
        icon={<IconSettings size={40} />}
        title="Pantalla en construcción"
        description="Aquí vivirán tus preferencias, exportar/importar y reset."
      />
    </Screen>
  )
}
