import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

// ── Icon components ───────────────────────────────────────────────────────────

function ScanIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
    </svg>
  );
}

function BoxesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
    </svg>
  );
}

function CircuitIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path strokeLinecap="round" d="M3 12h3M18 12h3M12 3v3M12 18v3" />
      <path strokeLinecap="round" d="M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18" />
    </svg>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  const baseClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group";
  const activeClass = "bg-blue-600 text-white";
  const inactiveClass =
    "text-slate-400 hover:bg-slate-700 hover:text-slate-100";

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseClass} ${isActive ? activeClass : inactiveClass}`
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

// ── Mobile bottom nav item ────────────────────────────────────────────────────

function MobileNavItem({ to, icon, label }: NavItemProps) {
  const baseClass =
    "flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors duration-150";
  const activeClass = "text-blue-400";
  const inactiveClass = "text-slate-400 hover:text-slate-200";

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${baseClass} ${isActive ? activeClass : inactiveClass}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navLinks: NavItemProps[] = [
    { to: "/", icon: <ScanIcon />, label: "Scanner" },
    { to: "/inventory", icon: <InventoryIcon />, label: "Inventory" },
    { to: "/boxes", icon: <BoxesIcon />, label: "Boxes" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-slate-800 border-r border-slate-700">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-700">
          <CircuitIcon />
          <span className="text-lg font-bold tracking-tight text-slate-100">
            invent-ory
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700">
          <p className="text-xs text-slate-500">PCB Component Inventory</p>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <CircuitIcon />
          <span className="font-bold text-slate-100">invent-ory</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="md:hidden flex items-center justify-around bg-slate-800 border-t border-slate-700 flex-shrink-0 pb-safe">
          {navLinks.map((link) => (
            <MobileNavItem key={link.to} {...link} />
          ))}
        </nav>
      </div>
    </div>
  );
}
