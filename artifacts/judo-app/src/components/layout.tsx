import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { LayoutDashboard, Users, CreditCard, Trophy, Building2, LogOut, Menu, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: user } = useGetMe();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru');
  };

  const navItems = [
    { href: "/dashboard", label: t("Dashboard"), icon: LayoutDashboard },
    ...(user?.role === 'super_admin' ? [{ href: "/clubs", label: t("Clubs"), icon: Building2 }] : []),
    { href: "/athletes", label: t("Athletes"), icon: Users },
    { href: "/payments", label: t("Payments"), icon: CreditCard },
    { href: "/competitions", label: t("Competitions"), icon: Trophy },
    ...(user?.role === 'super_admin' ? [{ href: "/admin", label: t("Admin"), icon: Shield }] : []),
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight text-sidebar-primary">JudoClub</h2>
      </div>
      <div className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer ${location === item.href ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70'}`}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </div>
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-sidebar-border space-y-4">
        <div className="flex items-center gap-3 px-3">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </div>
        </div>
        <div className="flex items-center justify-between px-3">
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
            {i18n.language === 'ru' ? 'EN' : 'RU'}
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); window.location.href = window.location.origin + (import.meta.env.BASE_URL ?? '/'); }} className="text-sidebar-foreground/70 hover:text-sidebar-foreground flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">{t("SignOut")}</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 md:block">
        <SidebarContent />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-4 md:hidden">
          <h2 className="text-xl font-bold text-primary">JudoClub</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
