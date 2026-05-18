import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { isAuthenticated, removeAdminToken } from "@/lib/auth";
import { Store, LayoutDashboard, Package, FolderTree, Settings, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/admin");
    }
  }, [setLocation]);

  const handleLogout = () => {
    removeAdminToken();
    setLocation("/admin");
  };

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const NavLinks = () => (
    <div className="space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </div>
  );

  if (!isAuthenticated()) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Store className="w-6 h-6 text-primary" />
          Admin
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border flex items-center gap-3">
                <Store className="w-8 h-8 text-primary" />
                <span className="font-bold text-xl">Admin Portal</span>
              </div>
              <div className="p-4 flex-1">
                <NavLinks />
              </div>
              <div className="p-4 border-t border-border">
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-card border-r border-border min-h-screen sticky top-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Store className="w-8 h-8 text-primary" />
          <span className="font-bold text-xl tracking-tight">Admin Portal</span>
        </div>
        <div className="p-4 flex-1">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        <header className="p-6 pb-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        </header>
        <main className="p-6 pt-4 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
