import { Fragment, useMemo } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { IconCheck, IconPill } from '../components/icons'
import { useStore, getDay } from '../lib/store'
import { lastDays } from '../lib/selectors'
import { supplementList } from '../lib/supplements'
import { useNav } from '../lib/nav'
import { weekdayShort } from '../lib/dates'
import { useToday } from './_shared'

export default function Supplements() {
  const state = useStore()
  const toggleSupplement = useStore((s) => s.toggleSupplement)
  const { show } = useToast()
  const go = useNav((s) => s.go)

  const today = useToday()
  const day = getDay(state, today)
  const active = supplementList(state.settings.enabledSupplements)

  const history = useMemo(() => lastDays(state, 14), [state])

  const compliance = useMemo(() => {
    if (active.length === 0) return 0
    let taken = 0
    let slots = 0
    for (const d of history) {
      for (const s of active) {
        slots += 1
        if (d.supplements[s.id]) taken += 1
      }
    }
    return slots > 0 ? Math.round((taken / slots) * 100) : 0
  }, [active, history])

  function handleToggle(id: (typeof active)[number]['id'], name: string) {
    const wasTaken = !!day.supplements[id]
    const xp = toggleSupplement(id)
    if (!wasTaken) show(xp > 0 ? `${name} tomado · +${xp} XP` : `${name} tomado`)
    else show(`${name} desmarcado`)
  }

  if (active.length === 0) {
    return (
      <Screen title="Suplementos">
        <EmptyState
          icon={<IconPill size={40} />}
          title="Sin suplementos activos"
          description="Activa creatina, omega-3, vitamina D o magnesio desde Ajustes para verlos aquí."
          action={
            <Button variant="primary" size="md" onClick={() => go('settings')}>
              Activar en Ajustes
            </Button>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen title="Suplementos" subtitle="Checklist de hoy">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          {active.map((supp) => {
            const taken = !!day.supplements[supp.id]
            return (
              <Card key={supp.id} tone={taken ? 'success' : 'default'} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-white">{supp.name}</p>
                  <p className="text-sm font-semibold text-white/50">{supp.dose}</p>
                  <p className="mt-1 text-xs text-white/40">{supp.note}</p>
                </div>
                <Button
                  variant={taken ? 'secondary' : 'primary'}
                  size="md"
                  className="shrink-0"
                  onClick={() => handleToggle(supp.id, supp.name)}
                >
                  {taken ? (
                    <span className="flex items-center gap-1.5">
                      <IconCheck size={16} /> Tomado
                    </span>
                  ) : (
                    'Marcar tomado'
                  )}
                </Button>
              </Card>
            )
          })}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-white/50">
              Últimos 14 días
            </h2>
            <span className="text-sm font-extrabold text-teal">{compliance}% cumplido</span>
          </div>
          <Card className="overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: `88px repeat(${history.length}, 1fr)` }}>
                <div />
                {history.map((d) => (
                  <div key={d.date} className="text-center text-[10px] font-semibold text-white/40">
                    {weekdayShort(d.date)[0]?.toUpperCase()}
                  </div>
                ))}
                {active.map((supp) => (
                  <Fragment key={supp.id}>
                    <div className="flex items-center truncate pr-2 text-xs font-semibold text-white/70">
                      {supp.name}
                    </div>
                    {history.map((d) => {
                      const taken = !!d.supplements[supp.id]
                      return (
                        <div key={`${supp.id}-${d.date}`} className="flex items-center justify-center py-0.5">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold ${
                              taken ? 'bg-teal text-navy-deep' : 'bg-white/5 text-white/20'
                            }`}
                          >
                            {taken ? <IconCheck size={12} /> : ''}
                          </span>
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Screen>
  )
}
