import {
  ChevronLeft,
  ChevronRight,
  FilePlus,
  FileText,
  LayoutDashboard,
  Pill,
  Settings,
  Sliders,
  Stethoscope,
  Users
} from 'lucide-react'
import type { AppPage } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
  collapsed: boolean
  onToggle: () => void
}

const navItems: { id: AppPage; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new-prescription', label: 'New Prescription', icon: FilePlus },
  { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { id: 'presets', label: 'Presets', icon: Sliders },
  { id: 'medicines', label: 'Medicines', icon: Pill },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggle
}: SidebarProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'bg-card print:hidden flex shrink-0 flex-col border-r transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b px-4',
          collapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Stethoscope className="text-primary-foreground size-5" />
        </div>
        {!collapsed && <span className="font-semibold whitespace-nowrap">PrescriptX</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('size-5 shrink-0', isActive && 'text-foreground')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <div className="border-t p-2">
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground hover:bg-accent flex w-full items-center justify-center rounded-lg p-2 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
    </div>
  )
}
