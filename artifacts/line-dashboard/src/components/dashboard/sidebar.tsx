import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Bell,
  Archive,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export type PageType = "dashboard" | "backup-pool" | "notification-settings"

const menuItems: { icon: typeof LayoutDashboard; label: string; page: PageType }[] = [
  { icon: LayoutDashboard, label: "แดชบอร์ด",      page: "dashboard" },
  { icon: Archive,         label: "ไลน์สำรอง",      page: "backup-pool" },
  { icon: Bell,            label: "ตั้งค่าแจ้งเตือน", page: "notification-settings" },
]

interface SidebarProps {
  activePage: PageType
  onPageChange: (page: PageType) => void
}

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleNavClick = (page: PageType) => {
    onPageChange(page)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex flex-col items-center mb-10 pt-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
              <img
                src="/images/logo.png"
                alt="LINE Dashboard"
                className="relative w-32 h-32 rounded-2xl object-cover shadow-lg shadow-primary/20"
              />
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.page}
                onClick={() => handleNavClick(item.page)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left",
                  activePage === item.page
                    ? "bg-sidebar-accent text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">A</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">ผู้ดูแลระบบ</p>
                <p className="text-xs text-muted-foreground">admin@line.hub</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
