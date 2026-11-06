import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, Users, MessageSquare, MoreHorizontal,
  Settings, LogOut, Handshake, Target
} from "lucide-react";
import { SalesSquadLogo, SalesSquadIcon } from "./SalesSquadLogo";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";

// Keep existing URLs so bookmarks and links continue to work.
const workspaces = [
  { icon: LayoutDashboard, label: "Home", path: "/", pages: [
    { label: "Dashboard", path: "/" },
    { label: "Sales funnel", path: "/north-star" },
    { label: "Analytics", path: "/analytics" },
  ] },
  { icon: Users, label: "Leads", path: "/leads", pages: [
    { label: "Lead pipeline", path: "/leads" },
  ] },
  { icon: MessageSquare, label: "Inbox", path: "/conversations", pages: [
    { label: "Conversations", path: "/conversations" },
    { label: "AI assistant", path: "/copilot" },
  ] },
  { icon: Handshake, label: "Partners", path: "/partners", pages: [
    { label: "Partner workspace", path: "/partners" },
  ] },
  { icon: Settings, label: "Settings", path: "/settings", pages: [
    { label: "Platform", path: "/settings" },
    { label: "WhatsApp", path: "/whatsapp-settings" },
    { label: "Equipment", path: "/products" },
    { label: "Subsidies", path: "/subsidies" },
  ] },
  { icon: Target, label: "Marketing", path: "/campaigns", pages: [
    { label: "Campaigns", path: "/campaigns" },
    { label: "Find leads", path: "/find-leads" },
    { label: "Outreach", path: "/automated-outreach" },
    { label: "QR codes", path: "/qr-generator" },
    { label: "Lead pages", path: "/dual-leads" },
    { label: "Solar video", path: "/solar-video" },
  ] },
];
const matchesPage = (location: string, path: string) =>
  path === "/" ? location === "/" : location === path || location.startsWith(`${path}/`);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <SalesSquadLogo size={48} />
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Sales Squad
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Sign in to access your lead generation and outreach platform.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full solar-gradient text-black font-semibold"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": `${sidebarWidth}px`,
      } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreOpener = useRef<HTMLButtonElement | null>(null);
  const openMore = (event: React.MouseEvent<HTMLButtonElement>) => {
    moreOpener.current = event.currentTarget;
    setMoreOpen(true);
  };
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigationLocation = ({
    "/scraper": "/find-leads",
    "/scraped-contacts": "/find-leads",
    "/partner-signups": "/partners",
    "/admin/referrals": "/partners",
  } as Record<string, string>)[location] ?? location;
  const activeWorkspace = workspaces.find(workspace =>
    workspace.pages.some(page => matchesPage(navigationLocation, page.path))
  );
  const activePage = activeWorkspace?.pages.find(page => matchesPage(navigationLocation, page.path));
  const navigate = (path: string) => {
    setLocation(path);
    setOpenMobile(false);
    setMoreOpen(false);
  };
  const isMobile = useIsMobile();
  useEffect(() => {
    setMoreOpen(false);
    setOpenMobile(false);
  }, [location, setOpenMobile]);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                {isCollapsed ? (
                  <SalesSquadIcon size={30} />
                ) : (
                  <SalesSquadLogo size={30} showText={false} />
                )}
              </button>
              {!isCollapsed ? (
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-bold text-white tracking-wide text-sm truncate">Sales Squad</span>
                  <span className="text-[#10b981] text-xs font-medium">Premium Leads</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {workspaces.slice(0, 4).map(item => {
                const isActive = activeWorkspace === item;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                      className="h-11 transition-all font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="More" className="h-11"
                  isActive={activeWorkspace?.label === "Marketing" || activeWorkspace?.label === "Settings"}
                  onClick={openMore}
                  aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls="workspace-more-menu"
                >
                  <MoreHorizontal className="h-4 w-4" /><span>More</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 hidden md:block w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "md:hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="min-w-0">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={openMore} aria-label="Open workspace menu" aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls="workspace-more-menu">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeWorkspace?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 min-w-0 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6">
          {activeWorkspace && (
            <div className="mb-6 space-y-3">
              <p className="hidden md:block text-sm font-medium text-muted-foreground">{activeWorkspace.label}</p>
              {activeWorkspace.pages.length > 1 && (
                <nav aria-label={`${activeWorkspace.label} pages`} className="flex flex-wrap gap-2">
                  {activeWorkspace.pages.map(page => (
                    <Link key={page.path} href={page.path}
                      aria-current={activePage === page ? "page" : undefined}
                      className={`rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activePage === page ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      {page.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          )}
          {children}
        </main>
      </SidebarInset>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {workspaces.slice(0, 3).map(item => (
          <button key={item.path} type="button" onClick={() => navigate(item.path)} aria-current={activeWorkspace === item ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${activeWorkspace === item ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <item.icon className="h-5 w-5" /><span>{item.label}</span>
          </button>
        ))}
        <button type="button" onClick={openMore} aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls="workspace-more-menu"
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${activeWorkspace && workspaces.indexOf(activeWorkspace) >= 3 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
          <MoreHorizontal className="h-5 w-5" /><span>More</span>
        </button>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent id="workspace-more-menu" side={isMobile ? "bottom" : "right"}
          onCloseAutoFocus={event => { event.preventDefault(); moreOpener.current?.focus(); }}
          className={`gap-0 p-0 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:right-2 [&>button]:top-2 ${isMobile ? "max-h-[85dvh] rounded-t-2xl" : "w-full sm:max-w-sm"}`}>
          <SheetHeader className="border-b p-5 pr-16">
            <SheetTitle>Your workspace</SheetTitle>
            <SheetDescription>Choose a workspace or tool.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <nav aria-label="More workspaces" className="space-y-1">
              {workspaces.slice(3, 5).map(item => (
                <button key={item.path} type="button" onClick={() => navigate(item.path)} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <item.icon className="h-5 w-5 text-primary" /><span>{item.label}</span>
                </button>
              ))}
            </nav>
            <p className="mt-5 mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Growth tools</p>
            <nav aria-label="Growth tools" className="space-y-1">
              {workspaces[5].pages.map(page => (
                <button key={page.path} type="button" onClick={() => navigate(page.path)} className="flex min-h-12 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{page.label}</button>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
