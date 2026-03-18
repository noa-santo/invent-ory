import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ScanLine, ClipboardList, Package, Cpu } from 'lucide-react'

// ── Brand name ────────────────────────────────────────────────────────────────

interface BrandNameProps {
    className?: string;
}

function BrandName( {className = ''}: BrandNameProps ) {
    return (
        <span
            className={className}
            style={{
                fontFamily: '\'Latin Modern Math\', \'Cambria Math\', \'Times New Roman\', serif',
                fontWeight: 'normal',
                display: 'inline-block',
                lineHeight: 1,
            }}
        >
            invent
            <span
                style={{
                    fontSize: '0.7em',
                    fontStyle: 'italic',
                    position: 'relative',
                    top: '-0.45em',
                    left: '0.02em',
                }}
            >
                ory
            </span>
        </span>
    )
}

// ── Nav item ──────────────────────────────────────────────────────────────────

interface NavItemProps {
    to: string;
    icon: ReactNode;
    label: string;
}

function NavItem( {to, icon, label}: NavItemProps ) {
    const baseClass =
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group'
    const activeClass = 'bg-primary text-primary-foreground'
    const inactiveClass =
        'text-slate-400 hover:bg-secondary hover:text-slate-100'

    return (
        <NavLink
            to={to}
            className={( {isActive} ) =>
                `${baseClass} ${isActive ? activeClass : inactiveClass}`
            }
        >
            <span className="flex-shrink-0">{icon}</span>
            <span>{label}</span>
        </NavLink>
    )
}

// ── Mobile bottom nav item ────────────────────────────────────────────────────

function MobileNavItem( {to, icon, label}: NavItemProps ) {
    const baseClass =
        'flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors duration-150'
    const activeClass = 'text-blue-400'
    const inactiveClass = 'text-slate-400 hover:text-slate-200'

    return (
        <NavLink
            to={to}
            className={( {isActive} ) =>
                `${baseClass} ${isActive ? activeClass : inactiveClass}`
            }
        >
            {icon}
            <span>{label}</span>
        </NavLink>
    )
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface LayoutProps {
    children: ReactNode;
}

export default function Layout( {children}: LayoutProps ) {
    const navLinks: NavItemProps[] = [
        {to: '/', icon: <ScanLine className="h-5 w-5"/>, label: 'Scanner'},
        {to: '/inventory', icon: <ClipboardList className="h-5 w-5"/>, label: 'Inventory'},
        {to: '/boxes', icon: <Package className="h-5 w-5"/>, label: 'Boxes'},
    ]

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* ── Desktop Sidebar ── */}
            <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-card border-r border-border">
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
                    <Cpu className="h-6 w-6 text-blue-400" strokeWidth={1.5}/>
                    <BrandName className="text-[32px] text-slate-100"/>
                </div>

                {/* Nav links */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navLinks.map(( link ) => (
                        <NavItem key={link.to} {...link} />
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border">
                    <p className="text-xs text-slate-500">PCB Component Inventory</p>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Mobile header */}
                <header
                    className="md:hidden flex items-center gap-2 px-4 py-3 bg-card border-b border-border flex-shrink-0">
                    <Cpu className="h-6 w-6 text-blue-400" strokeWidth={1.5}/>
                    <BrandName className="text-2xl text-slate-100"/>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>

                {/* ── Mobile Bottom Nav ── */}
                <nav
                    className="md:hidden flex items-center justify-around bg-card border-t border-border flex-shrink-0 pb-safe">
                    {navLinks.map(( link ) => (
                        <MobileNavItem key={link.to} {...link} />
                    ))}
                </nav>
            </div>
        </div>
    )
}
