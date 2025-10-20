import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Edit3, Settings, Home, Download } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
const mainItems = [{
  title: "Dashboard",
  url: "/dashboard",
  icon: Home
}, {
  title: "Legacy Journal",
  url: "/journal",
  icon: BookOpen
}, {
  title: "Editor",
  url: "/editor",
  icon: Edit3
}, {
  title: "Export",
  url: "/export",
  icon: Download
}, {
  title: "Settings",
  url: "/settings",
  icon: Settings
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-legacy-accent/10 text-legacy-accent border-r-2 border-legacy-accent font-medium" : "hover:bg-legacy-primary/5 text-legacy-ink";
  return <Sidebar variant="sidebar" className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r border-legacy-border">
        <div className="p-4 border-b border-legacy-border">
          {!collapsed && <div className="text-center">
              <h2 className="text-lg font-semibold text-legacy-primary">Your Legacy Journal</h2>
              
            </div>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-legacy-primary/70">
            {!collapsed && "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}