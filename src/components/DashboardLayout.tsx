import type React from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { Button } from "@/components/ui/button"
import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-slate-200 bg-white shadow-sm flex items-center px-6 gap-4">
            <SidebarTrigger className="hover:bg-blue-50 hover:text-blue-600 rounded-lg p-2 transition-colors" />




          </header>

          <main className="flex-1 p-6 bg-gradient-to-br from-slate-50 to-blue-50/30">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DashboardLayout
