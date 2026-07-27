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
    <div className="bg-glow mx-auto flex min-h-svh max-w-md flex-col bg-background">
      <main id="app-scroll" className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      <nav className="fixed inset-x-4 bottom-4 mx-auto max-w-md rounded-full border border-border bg-card/90 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between px-1.5 py-1.5">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-all',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full transition-all',
                      isActive &&
                        'bg-gradient-to-b from-flame-400 to-flame-600 shadow-[0_2px_12px_var(--flame-glow)]',
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className={isActive ? 'text-foreground' : undefined}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
