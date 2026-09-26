// src/components/layout/Sidebar.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Sprout,
  Droplets,
  SlidersHorizontal,
  BarChart3,
  Bell,
  Brain,
  MessageSquareText,
  User,
  Users,
  Cpu,
  Layers,
  Link2,
  HardDriveUpload,
  MapPin,
  Warehouse,
  Database,
  Radio,
  Wrench,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import YakuMark from '@/components/layout/YakuMark';

interface NavItem {
  type: 'item';
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  mobilePrimary?: boolean;
}

interface NavSection {
  type: 'section';
  id: string;
  title: string;
}

type NavEntry = NavItem | NavSection;

const farmerNavEntries: NavEntry[] = [
  { type: 'section', id: 'sec-cultivo', title: 'Cultivo y Campo' },
  { type: 'item', id: 'farmer-dashboard', label: 'Panel de control', href: '/dashboard/agricultor', icon: LayoutDashboard, mobilePrimary: true },
  { type: 'item', id: 'farmer-crops', label: 'Mis cultivos', href: '/dashboard/agricultor/cultivos', icon: Sprout, mobilePrimary: true },

  { type: 'section', id: 'sec-agua', title: 'Agua y Riego' },
  { type: 'item', id: 'farmer-water', label: 'Fuente de agua', href: '/dashboard/agricultor/fuente-agua', icon: Droplets },
  { type: 'item', id: 'farmer-control', label: 'Control de Riego', href: '/dashboard/agricultor/control', icon: SlidersHorizontal, mobilePrimary: true },

  { type: 'section', id: 'sec-analisis', title: 'Análisis' },
  { type: 'item', id: 'farmer-historical', label: 'Históricos', href: '/dashboard/agricultor/historico', icon: BarChart3 },
  { type: 'item', id: 'farmer-notifications', label: 'Notificaciones', href: '/dashboard/agricultor/notificaciones', icon: Bell, mobilePrimary: true },
  { type: 'item', id: 'farmer-predictive', label: 'Inteligencia IA', href: '/dashboard/agricultor/ml', icon: Brain },

  { type: 'section', id: 'sec-feedback', title: 'Opinión' },
  { type: 'item', id: 'farmer-feedback', label: 'Valoraciones', href: '/dashboard/agricultor/feedback', icon: MessageSquareText },
];

// Pantallas de administrador que un agricultor puede ver si se le otorgó el
// permiso granular correspondiente (HU-31), sin necesitar el rol completo.
const DELEGABLE_NAV_ITEMS: (NavItem & { permiso: string })[] = [
  { type: 'item', id: 'delegated-backup', label: 'Respaldo de datos', href: '/dashboard/administrador/respaldo', icon: Database, permiso: 'GESTIONAR_RESPALDOS' },
  { type: 'item', id: 'delegated-audit', label: 'Auditoría', href: '/dashboard/administrador/mantenimiento', icon: Wrench, permiso: 'VER_AUDITORIA' },
];

function buildDelegatedEntries(permisos: string[]): NavEntry[] {
  const items = DELEGABLE_NAV_ITEMS.filter((item) => permisos.includes(item.permiso));
  if (items.length === 0) return [];
  return [
    { type: 'section', id: 'sec-delegado', title: 'Delegado por admin' },
    ...items.map(({ permiso, ...item }) => item),
  ];
}

const adminNavEntries: NavEntry[] = [
  { type: 'section', id: 'sec-supervision', title: 'Supervisión' },
  { type: 'item', id: 'admin-dashboard', label: 'Panel global', href: '/dashboard/administrador', icon: LayoutDashboard, mobilePrimary: true },
  { type: 'item', id: 'admin-users', label: 'Usuarios', href: '/dashboard/administrador/usuarios', icon: Users, mobilePrimary: true },

  { type: 'section', id: 'sec-iot', title: 'Dispositivos IoT' },
  { type: 'item', id: 'admin-devices', label: 'Dispositivos', href: '/dashboard/administrador/dispositivos', icon: Cpu, mobilePrimary: true },
  { type: 'item', id: 'admin-components', label: 'Componentes', href: '/dashboard/administrador/componentes', icon: Layers },
  { type: 'item', id: 'admin-assign-device', label: 'Asignar dispositivo', href: '/dashboard/administrador/asignar-dispositivo', icon: Link2 },
  { type: 'item', id: 'admin-firmware', label: 'Firmware', href: '/dashboard/administrador/firmware', icon: HardDriveUpload, mobilePrimary: true },
  { type: 'item', id: 'admin-maintenance', label: 'Auditoría', href: '/dashboard/administrador/mantenimiento', icon: Wrench },

  { type: 'section', id: 'sec-catalogos', title: 'Catálogos' },
  { type: 'item', id: 'admin-catalogs', label: 'Catálogos', href: '/dashboard/administrador/catalogo', icon: MapPin },
  { type: 'item', id: 'admin-warehouses', label: 'Almacenes', href: '/dashboard/administrador/almacenes', icon: Warehouse },

  { type: 'section', id: 'sec-config', title: 'Configuración' },
  { type: 'item', id: 'admin-feedback', label: 'Preguntas feedback', href: '/dashboard/administrador/feedback', icon: MessageSquareText },
  { type: 'item', id: 'admin-mqtt', label: 'Configuración MQTT', href: '/dashboard/administrador/mqtt-config', icon: Radio },
  { type: 'item', id: 'admin-backup', label: 'Respaldo de datos', href: '/dashboard/administrador/respaldo', icon: Database },
];

export default function Sidebar({ initials = "JR" }: { initials?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [openProfile, setOpenProfile] = useState(false);
  const [openMore, setOpenMore] = useState(false);
  const desktopProfileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Detección responsiva de pantalla grande (>= 1100px)
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(true);
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1100px)');
    const updateMatches = (e: MediaQueryList | MediaQueryListEvent) => {
      setIsLargeScreen(e.matches);
      setUserCollapsed(null); // Resetea preferencia manual al cambiar de tamaño de pantalla
    };
    updateMatches(mediaQuery);
    mediaQuery.addEventListener('change', updateMatches);
    return () => mediaQuery.removeEventListener('change', updateMatches);
  }, []);

  const isExpanded = userCollapsed !== null ? !userCollapsed : isLargeScreen;

  // Sincronizar ancho con la variable CSS para adaptar el layout de la app
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.style.setProperty(
      '--sidebar-current-width',
      isExpanded ? '240px' : '78px'
    );
  }, [isExpanded]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (!target) return;

      const isInsideDesktop = desktopProfileRef.current && desktopProfileRef.current.contains(target);
      const isInsideMobile = mobileProfileRef.current && mobileProfileRef.current.contains(target);

      if (!isInsideDesktop && !isInsideMobile) {
        setOpenProfile(false);
      }

      if (moreRef.current && !moreRef.current.contains(target)) {
        setOpenMore(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const userRole = user?.rol || 'agricultor';
  const isAdmin = userRole === 'administrador';
  const roleLabel = isAdmin ? 'Administrador' : 'Agricultor';
  const userName = user?.name || (isAdmin ? 'Administrador Yaku' : 'Agricultor Yaku');
  const profileHref = isAdmin ? '/dashboard/administrador/perfil' : '/dashboard/agricultor/perfil';

  const navEntries = isAdmin
    ? adminNavEntries
    : [...farmerNavEntries, ...buildDelegatedEntries(user?.permisos || [])];

  const isRouteActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/dashboard/agricultor' || href === '/dashboard/administrador') {
      return pathname === href;
    }
    if (href === '/dashboard/agricultor/notificaciones' && pathname === '/dashboard/agricultor/alertas') {
      return true;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Saber si alguna opción secundaria de móvil está activa para iluminar el botón «Más»
  const isMoreActive = navEntries.some(
    (entry) => entry.type === 'item' && !entry.mobilePrimary && isRouteActive(entry.href)
  );

  const handleLogout = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenProfile(false);
    setOpenMore(false);

    try {
      localStorage.removeItem('yaku_user');
      localStorage.removeItem('yaku_token');

      const logoutPromise = logout();
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
      await Promise.race([logoutPromise, timeoutPromise]);
    } catch (err) {
      console.error('Error durante el cierre de sesión:', err);
    } finally {
      window.location.href = '/auth/login';
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-container {
          position: fixed;
          background: var(--sidebar);
          border: 1px solid var(--sidebar-border);
          z-index: 100;
          display: flex;
          backdrop-filter: blur(12px);
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          box-sizing: border-box;
        }

        /* --- MOBILE (< 1000px) --- */
        @media (max-width: 999px) {
          .sidebar-container {
            bottom: 0;
            left: 0;
            width: 100% !important;
            height: calc(64px + env(safe-area-inset-bottom, 0px));
            flex-direction: row;
            justify-content: space-around;
            align-items: center;
            padding: 0 6px env(safe-area-inset-bottom, 0px) 6px;
            border-radius: 20px 20px 0 0;
            border-bottom: none;
          }
          .desktop-sidebar-content {
            display: none !important;
          }
          .mobile-sidebar-content {
            display: flex !important;
            width: 100%;
            align-items: center;
            justify-content: space-around;
            gap: 2px;
          }
          .mobile-nav-item {
            width: clamp(38px, 10vw, 44px);
            height: clamp(38px, 10vw, 44px);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #7f93a3;
            text-decoration: none;
            position: relative;
            touch-action: manipulation;
            transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
          }
          .mobile-nav-item:hover {
            color: #cbd5e1;
            background: rgba(255,255,255,0.05);
          }
          .mobile-nav-item.active {
            color: var(--green);
            background: var(--greenbg);
            border: 1px solid var(--greenbrd);
          }
          .mobile-nav-item.active::before {
            content: '';
            position: absolute;
            bottom: 3px;
            left: 50%;
            transform: translateX(-50%);
            width: 14px;
            height: 3px;
            background-color: var(--green);
            border-radius: 2px;
          }
          .more-menu {
            position: absolute;
            bottom: calc(68px + env(safe-area-inset-bottom, 0px));
            right: 48px;
            width: 230px;
            max-height: 70vh;
            overflow-y: auto;
            background: var(--popover);
            border: 1px solid var(--border2-mockup);
            border-radius: 16px;
            padding: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            gap: 4px;
            z-index: 120;
          }
          .dropdown-menu {
            bottom: calc(68px + env(safe-area-inset-bottom, 0px));
            right: 8px;
            left: auto !important;
          }
        }

        /* --- DESKTOP (>= 1000px) --- */
        @media (min-width: 1000px) {
          .mobile-sidebar-content {
            display: none !important;
          }
          .desktop-sidebar-content {
            display: flex !important;
            flex-direction: column;
            width: 100%;
            height: 100%;
          }
          .sidebar-container {
            top: 12px;
            left: 16px;
            height: calc(100vh - 24px);
            border-radius: 24px;
          }
          .dropdown-menu {
            bottom: 58px;
            left: 60px;
          }
        }

        /* --- ESTILOS DE ELEMENTOS EXPANDIDOS --- */
        .nav-item-expanded {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 500;
          border: 1px solid transparent;
          color: #9fb3c3;
          text-decoration: none;
          transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
          position: relative;
          box-sizing: border-box;
        }

        .nav-item-expanded:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #f1f5f9;
        }

        .nav-item-expanded.active {
          background: var(--greenbg);
          color: var(--green);
          border: 1px solid var(--greenbrd);
          font-weight: 600;
        }

        .nav-item-expanded.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 18px;
          width: 3.5px;
          background-color: var(--green);
          border-radius: 0 3px 3px 0;
        }

        /* --- ESTILOS DE ELEMENTOS COLAPSADOS --- */
        .nav-item-collapsed {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7f93a3;
          text-decoration: none;
          transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
          position: relative;
          margin: 0 auto;
        }

        .nav-item-collapsed:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
        }

        .nav-item-collapsed.active {
          background: var(--greenbg);
          color: var(--green);
          border: 1px solid var(--greenbrd);
        }

        .nav-item-collapsed.active::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          height: 20px;
          width: 3.5px;
          background-color: var(--green);
          border-radius: 0 4px 4px 0;
        }

        .menu-panel {
          position: absolute;
          width: 210px;
          background: var(--popover);
          border: 1px solid var(--border2-mockup);
          border-radius: 14px;
          padding: 6px;
          box-shadow: 0 16px 40px -8px rgba(0,0,0,0.6);
          z-index: 150;
        }
        .menu-head {
          padding: 8px 10px;
          font-size: 11px;
          border-bottom: 1px solid var(--border-mockup);
          margin-bottom: 4px;
        }
        .menu-item {
          width: 100%;
          min-height: 0;
          background: transparent;
          border: none;
          text-decoration: none;
          color: var(--foreground);
          padding: 9px 10px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.875rem;
          text-align: left;
          transition: background-color 150ms ease;
        }
        .menu-item:hover { background: rgba(255,255,255,0.05); }
        .menu-item.danger { color: #f87171; }
        .menu-item.danger:hover { background: var(--redbg); }
        .menu-item.active { color: var(--green); background: var(--greenbg); }
        .menu-label {
          padding: 6px 10px 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--muted-foreground);
        }
        .nav-section-label {
          padding: 14px 10px 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--muted-foreground);
          user-select: none;
        }
        .brand-tile {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          color: #04130a;
          background: linear-gradient(145deg, #4ade80, #16a34a);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px -4px rgba(22,163,74,0.55);
          flex-shrink: 0;
        }

        /* Scrollbar personalizado para el menú */
        .sidebar-scroll {
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
      `}} />

      <aside
        className="sidebar-container"
        style={{
          width: isExpanded ? '240px' : '78px',
          padding: isExpanded ? '16px 12px' : '16px 8px',
        }}
      >
        {/* =========================================================
            VISTA DE ESCRITORIO (DINÁMICA: EXPANDIDA O COLAPSADA)
        ========================================================= */}
        <div className="desktop-sidebar-content">
          {/* HEADER DEL SIDEBAR */}
          {isExpanded ? (
            <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-[var(--border-mockup)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="brand-tile w-9 h-9">
                  <YakuMark size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-base text-white tracking-tight leading-tight">Yaku</span>
                  <span className="text-[11px] text-slate-400 font-medium truncate">{roleLabel}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserCollapsed(true)}
                title="Colapsar barra lateral"
                aria-label="Colapsar barra lateral"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer border-none bg-transparent"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center pb-3 mb-2 border-b border-[var(--border-mockup)] gap-2">
              <button
                type="button"
                onClick={() => setUserCollapsed(false)}
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
                className="brand-tile w-10 h-10 p-0 border-none cursor-pointer transition-transform hover:scale-105"
              >
                <YakuMark size={21} />
              </button>
              <button
                type="button"
                onClick={() => setUserCollapsed(false)}
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
                className="p-1 text-slate-500 hover:text-emerald-400 transition-colors border-none bg-transparent cursor-pointer"
              >
                <PanelLeftOpen size={15} />
              </button>
            </div>
          )}

          {/* LISTA DE NAVEGACIÓN */}
          <div className={`sidebar-scroll flex-1 my-1 pr-1 ${isExpanded ? 'flex flex-col gap-0.5' : 'flex flex-col items-center gap-1.5'}`}>
            {navEntries.map((entry) => {
              if (entry.type === 'section') {
                if (isExpanded) {
                  return (
                    <div key={entry.id} className="nav-section-label">
                      {entry.title}
                    </div>
                  );
                }
                return <div key={entry.id} className="w-8 my-1.5 border-t border-[var(--border-mockup)]" />;
              }

              const active = isRouteActive(entry.href);
              const IconComponent = entry.icon;

              if (isExpanded) {
                return (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    onMouseEnter={() => router.prefetch(entry.href)}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-item-expanded ${active ? 'active' : ''}`}
                  >
                    <IconComponent size={19} className="shrink-0" />
                    <span className="truncate leading-tight">{entry.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  title={entry.label}
                  aria-label={entry.label}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => router.prefetch(entry.href)}
                  className={`nav-item-collapsed ${active ? 'active' : ''}`}
                >
                  <IconComponent size={21} />
                </Link>
              );
            })}
          </div>

          {/* PERFIL / PIE DE PÁGINA */}
          {isExpanded ? (
            <div className="pt-2.5 mt-auto border-t border-[var(--border-mockup)]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-[var(--border-mockup)]">
                <Link
                  href={profileHref}
                  className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity text-left text-decoration-none"
                  title="Ver mi perfil"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-600/25 border border-emerald-500/40 flex items-center justify-center text-xs text-emerald-300 font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-semibold truncate leading-tight">{userName}</p>
                    <p className="text-slate-400 text-[11px] truncate leading-tight mt-0.5">{roleLabel} · Mi perfil</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => handleLogout(e)}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 ml-1 border-none bg-transparent cursor-pointer"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div ref={desktopProfileRef} className="pt-2 mt-auto border-t border-[var(--border-mockup)] flex flex-col items-center relative">
              <button
                type="button"
                onClick={() => setOpenProfile(!openProfile)}
                title="Mi cuenta"
                aria-label="Mi cuenta"
                aria-expanded={openProfile}
                className="w-10 h-10 p-0 rounded-full bg-white/[0.05] border border-[var(--border2-mockup)] flex items-center justify-center text-slate-300 font-bold text-xs hover:border-emerald-500/50 transition-colors cursor-pointer"
              >
                {initials}
              </button>

              {/* DROPDOWN FLOTANTE CUANDO ESTÁ COLAPSADO */}
              {openProfile && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  role="menu"
                  className="dropdown-menu menu-panel"
                >
                  <div className="menu-head">
                    <div className="text-white font-semibold truncate text-[13px]">{userName}</div>
                    <div className="text-slate-400">{roleLabel}</div>
                  </div>
                  <Link href={profileHref} role="menuitem" onClick={() => setOpenProfile(false)} className="menu-item">
                    <User size={17} aria-hidden />
                    Mi perfil
                  </Link>
                  <button type="button" role="menuitem" onClick={(e) => handleLogout(e)} className="menu-item danger">
                    <LogOut size={17} aria-hidden />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================
            VISTA MÓVIL (< 1000px): BARRA DE NAVEGACIÓN INFERIOR
        ========================================================= */}
        <div className="mobile-sidebar-content">
          {navEntries
            .filter((e): e is NavItem => e.type === 'item' && !!e.mobilePrimary)
            .map((item) => {
              const active = isRouteActive(item.href);
              const IconComp = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`mobile-nav-item ${active ? 'active' : ''}`}
                >
                  <IconComp size={22} />
                </Link>
              );
            })}

          {/* BOTÓN «MÁS» PARA MÓVIL */}
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              type="button"
              title="Más opciones"
              aria-label="Más opciones"
              aria-expanded={openMore}
              onClick={() => {
                setOpenMore(!openMore);
                setOpenProfile(false);
              }}
              className={`mobile-nav-item p-0 ${isMoreActive ? 'active' : ''}`}
              style={{ background: isMoreActive ? undefined : 'transparent', border: isMoreActive ? undefined : 'none' }}
            >
              <MoreHorizontal size={22} />
            </button>

            {openMore && (
              <div
                className="more-menu"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="menu-label">
                  {isAdmin ? 'Administración' : 'Más opciones'}
                </div>
                {navEntries
                  .filter((e): e is NavItem => e.type === 'item' && !e.mobilePrimary)
                  .map((item) => {
                    const active = isRouteActive(item.href);
                    const IconComp = item.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setOpenMore(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`menu-item ${active ? 'active' : ''}`}
                      >
                        <IconComp size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>

          {/* PERFIL MÓVIL */}
          <div ref={mobileProfileRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setOpenProfile(!openProfile);
                setOpenMore(false);
              }}
              title="Mi cuenta"
              aria-label="Mi cuenta"
              aria-expanded={openProfile}
              className="w-[38px] h-[38px] p-0 rounded-full bg-white/[0.05] border border-[var(--border2-mockup)] flex items-center justify-center text-slate-300 font-bold text-xs cursor-pointer"
            >
              {initials}
            </button>

            {openProfile && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                role="menu"
                  className="dropdown-menu menu-panel"
                >
                  <div className="menu-head">
                    <div className="text-white font-semibold truncate text-[13px]">{userName}</div>
                    <div className="text-slate-400">{roleLabel}</div>
                  </div>
                  <Link href={profileHref} role="menuitem" onClick={() => setOpenProfile(false)} className="menu-item">
                    <User size={17} aria-hidden />
                    Mi perfil
                  </Link>
                  <button type="button" role="menuitem" onClick={(e) => handleLogout(e)} className="menu-item danger">
                  <LogOut size={17} aria-hidden />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
