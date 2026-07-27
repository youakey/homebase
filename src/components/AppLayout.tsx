import { NavLink, Outlet } from 'react-router-dom'
import { UtensilsCrossed, Sparkles, MessagesSquare, Trophy, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/menu', label: 'Меню', icon: UtensilsCrossed },
  { to: '/cleaning', label: 'Уборка', icon: Sparkles },
  { to: '/social', label: 'Общение', icon: MessagesSquare },
  { to: '/stats', label: 'Статистика', icon: Trophy },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-background">
      <main id="app-scroll" className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
