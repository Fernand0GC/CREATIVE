import { useState } from "react";
import {
  ClipboardList,
  CreditCard,
  BookOpen,
  BarChart3,
  Wrench,
  Users,
  LogOut,
  Menu
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const items = [
  { title: "Órdenes de trabajo", url: "/orders", icon: ClipboardList },
  { title: "Pagos", url: "/payments", icon: CreditCard },
  { title: "Libro diario", url: "/journal", icon: BookOpen },
  { title: "Reportes", url: "/reports", icon: BarChart3 },
  { title: "Servicios", url: "/services", icon: Wrench },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path);
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  // Show users menu only for admin
  const allItems = user?.isAdmin
    ? [...items, { title: "Usuarios", url: "/users", icon: Users }]
    : items;

  return (
    <Sidebar
      className={`${isCollapsed ? "w-16" : "w-64"} border-r bg-card/50 backdrop-blur-sm transition-smooth `}
      collapsible="icon"
    >
      <SidebarHeader
        className="p-4 bg-blue-700 text-white cursor-pointer hover:bg-blue-800 transition-colors"
        onClick={() => navigate('/')}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-soft flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-foreground text-white">CREATIVE</h2>
              <p className="text-xs text-muted-foreground text-slate-300">Dashboard</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 bg-blue-700 text-white">
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only text-slate-400" : " text-slate-400"}>
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink
                      to={item.url}
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t bg-blue-700">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-slate-50 text-slate-50 text-xs">
              {user?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-slate-50 text-sm font-medium text-foreground truncate">
                {user?.name}
              </p>
              <p className=" text-slate-200 text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground text-white bg-red-600 hover:bg-red-700 hover:text-slate-300  "
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}