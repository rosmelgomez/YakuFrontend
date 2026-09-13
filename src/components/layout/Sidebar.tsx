// src/components/layout/Sidebar.tsx
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  Settings,
  SlidersHorizontal,
  Brain,
  LogOut,
  Users,
  Cpu,
  MapPin,
  Database,
  User,
  Warehouse,
  HardDriveUpload,
  MessageSquareText,
  MoreHorizontal,
} from 'lucide-react';

export default function Sidebar({ initials = "JR" }: { initials?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openProfile, setOpenProfile] = useState(false);
  const [openMore, setOpenMore] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const userRole = session?.user?.rol;
  const isAdmin = userRole === 'administrador';
  const isFarmer = userRole === 'agricultor';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpenProfile(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setOpenMore(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isFarmerMoreActive = Boolean(
    pathname?.includes('/ml') || pathname?.includes('/feedback')
  );

  const isAdminMoreActive = Boolean(
    pathname?.includes('/catalogo') ||
    pathname?.includes('/feedback') ||
    pathname?.includes('/respaldo') ||
    pathname?.includes('/almacenes')
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-container {
          position: fixed;
          background: #07111d;
          border: 1px solid #1e293b;
          z-index: 100;
          display: flex;
          align-items: center;
          backdrop-filter: blur(12px);
        }

        /* --- MOBILE (Barra de Navegación Inferior) --- */
        @media (max-width: 999px) {
          .sidebar-container {
            bottom: 0;
            left: 0;
            width: 100%;
            height: calc(64px + env(safe-area-inset-bottom, 0px));
            flex-direction: row;
            justify-content: space-around;
            padding: 0 6px env(safe-area-inset-bottom, 0px) 6px;
            border-radius: 20px 20px 0 0;
            border-bottom: none;
            box-sizing: border-box;
          }
          .sidebar-logo { display: none !important; }
          .sidebar-menu {
            display: contents !important;
          }
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
          }
          .nav-item {
            width: 44px;
            height: 44px;
            border-radius: 12px;
          }
          .profile-wrapper, .more-wrapper { 
            margin-top: 0 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .dropdown-menu {
            bottom: calc(68px + env(safe-area-inset-bottom, 0px));
            right: 8px;
            left: auto !important;
          }
          .more-menu {
            position: absolute;
            bottom: calc(68px + env(safe-area-inset-bottom, 0px));
            right: 48px;
            width: 230px;
            background: #081420;
            border: 1px solid #1e293b;
            border-radius: 16px;
            padding: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            gap: 4px;
            z-index: 120;
          }
          /* Indicador activo abajo en móvil */
          .nav-item.active::before {
            content: '';
            position: absolute;
            bottom: 4px;
            left: 50%;
            transform: translateX(-50%);
            width: 14px;
            height: 3px;
            background-color: #22c55e;
            border-radius: 2px;
          }
        }

        /* --- DESKTOP (Barra Lateral Izquierda) --- */
        @media (min-width: 1000px) {
          .mobile-only {
            display: none !important;
          }
          .desktop-only {
            display: flex !important;
          }
          .sidebar-container {
            top: 12px;
            left: 16px;
            width: 82px;
            height: calc(100vh - 24px);
            flex-direction: column;
            padding: 18px 0;
            border-radius: 24px;
          }
          .sidebar-menu {
            flex-direction: column !important;
            gap: 14px !important;
          }
          .profile-wrapper { margin-top: auto !important; }
          .dropdown-menu {
            bottom: 58px;
            left: 60px;
          }
          /* Indicador activo a la izquierda en PC */
          .nav-item.active::before {
            content: '';
            position: absolute;
            left: -16px;
            top: 50%;
            transform: translateY(-50%);
            height: 24px;
            width: 4px;
            background-color: #22c55e;
            border-radius: 0 4px 4px 0;
          }
        }

        /* --- ESTILOS DE LOS BOTONES --- */
        .nav-item {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .2s ease;
          position: relative;
          text-decoration: none;
        }

        .nav-item:not(.active) {
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
        }

        .nav-item:not(.active):hover {
          background: rgba(255,255,255,0.05);
          color: #cbd5e1;
        }

        .nav-item.active {
          border: 1px solid rgba(34,197,94,0.3);
          background: rgba(34,197,94,0.12);
          color: #22c55e;
        }
      `}} />

      <aside className="sidebar-container">
        {/* LOGO (Se oculta en móvil) */}
        <div className="sidebar-logo" style={{
          width: '48px', height: '48px', background: 'white', borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px', fontSize: '1.3rem'
        }}>
          🌱
        </div>

        {/* MENÚ DE NAVEGACIÓN */}
        <div className="sidebar-menu" style={{ display: 'flex' }}>
          {isFarmer && (
            <>
              {/* Acciones principales en móvil y escritorio */}
              <SidebarButton title="Dashboard" href="/dashboard/agricultor" active={pathname === '/dashboard/agricultor'} icon={<LayoutDashboard size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton title="Histórico" href="/dashboard/agricultor/historico" active={pathname?.includes('/historico')} icon={<BarChart3 size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton title="Alertas" href="/dashboard/agricultor/alertas" active={pathname?.includes('/alertas')} icon={<Bell size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton title="Control" href="/dashboard/agricultor/control" active={pathname?.includes('/control')} icon={<SlidersHorizontal size={22} />} onPrefetch={router.prefetch} />

              {/* Acciones secundarias: visibles directas en PC */}
              <SidebarButton className="desktop-only" title="Inteligencia ML" href="/dashboard/agricultor/ml" active={pathname?.includes('/ml')} icon={<Brain size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton className="desktop-only" title="Feedback" href="/dashboard/agricultor/feedback" active={pathname?.includes('/feedback')} icon={<MessageSquareText size={22} />} onPrefetch={router.prefetch} />

              {/* Botón «Más» para móvil */}
              <div ref={moreRef} className="more-wrapper mobile-only">
                <button
                  type="button"
                  title="Más secciones"
                  onClick={() => setOpenMore(!openMore)}
                  className={`nav-item ${isFarmerMoreActive ? 'active' : ''}`}
                  style={{ border: 'none', background: isFarmerMoreActive ? 'rgba(34,197,94,0.12)' : 'transparent' }}
                >
                  <MoreHorizontal size={22} />
                </button>

                {openMore && (
                  <div className="more-menu">
                    <div style={{ padding: '6px 10px 4px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Más opciones
                    </div>
                    <Link
                      href="/dashboard/agricultor/ml"
                      onClick={() => setOpenMore(false)}
                      style={{
                        padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none', color: pathname?.includes('/ml') ? '#22c55e' : '#cbd5e1',
                        background: pathname?.includes('/ml') ? 'rgba(34,197,94,0.12)' : 'transparent',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Brain size={18} />
                      Inteligencia ML
                    </Link>
                    <Link
                      href="/dashboard/agricultor/feedback"
                      onClick={() => setOpenMore(false)}
                      style={{
                        padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none', color: pathname?.includes('/feedback') ? '#22c55e' : '#cbd5e1',
                        background: pathname?.includes('/feedback') ? 'rgba(34,197,94,0.12)' : 'transparent',
                        fontSize: '0.9rem'
                      }}
                    >
                      <MessageSquareText size={18} />
                      Enviar Feedback
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {isAdmin && (
            <>
              {/* 4 Acciones principales para Administrador */}
              <SidebarButton title="Dashboard" href="/dashboard/administrador" active={pathname === '/dashboard/administrador'} icon={<LayoutDashboard size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton title="Usuarios" href="/dashboard/administrador/usuarios" active={pathname === '/dashboard/administrador/usuarios'} icon={<Users size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton title="Dispositivos" href="/dashboard/administrador/dispositivos" active={pathname === '/dashboard/administrador/dispositivos'} icon={<Cpu size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton title="Firmware" href="/dashboard/administrador/firmware" active={pathname === '/dashboard/administrador/firmware'} icon={<HardDriveUpload size={22} />} onPrefetch={router.prefetch} />

              {/* Acciones secundarias en PC */}
              <SidebarButton className="desktop-only" title="Catálogo" href="/dashboard/administrador/catalogo" active={pathname === '/dashboard/administrador/catalogo'} icon={<MapPin size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton className="desktop-only" title="Feedback" href="/dashboard/administrador/feedback" active={pathname === '/dashboard/administrador/feedback'} icon={<MessageSquareText size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton className="desktop-only" title="Respaldo" href="/dashboard/administrador/respaldo" active={pathname === '/dashboard/administrador/respaldo'} icon={<Database size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton className="desktop-only" title="Almacenes" href="/dashboard/administrador/almacenes" active={pathname === '/dashboard/administrador/almacenes'} icon={<Warehouse size={22} />} onPrefetch={router.prefetch} />

              {/* Botón «Más» para móvil Administrador */}
              <div ref={moreRef} className="more-wrapper mobile-only">
                <button
                  type="button"
                  title="Más herramientas"
                  onClick={() => setOpenMore(!openMore)}
                  className={`nav-item ${isAdminMoreActive ? 'active' : ''}`}
                  style={{ border: 'none', background: isAdminMoreActive ? 'rgba(34,197,94,0.12)' : 'transparent' }}
                >
                  <MoreHorizontal size={22} />
                </button>

                {openMore && (
                  <div className="more-menu">
                    <div style={{ padding: '6px 10px 4px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Administración
                    </div>
                    <Link
                      href="/dashboard/administrador/catalogo"
                      onClick={() => setOpenMore(false)}
                      style={{
                        padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none', color: pathname === '/dashboard/administrador/catalogo' ? '#22c55e' : '#cbd5e1',
                        background: pathname === '/dashboard/administrador/catalogo' ? 'rgba(34,197,94,0.12)' : 'transparent',
                        fontSize: '0.9rem'
                      }}
                    >
                      <MapPin size={18} />
                      Catálogo de Plantas
                    </Link>
                    <Link
                      href="/dashboard/administrador/feedback"
                      onClick={() => setOpenMore(false)}
                      style={{
                        padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none', color: pathname === '/dashboard/administrador/feedback' ? '#22c55e' : '#cbd5e1',
                        background: pathname === '/dashboard/administrador/feedback' ? 'rgba(34,197,94,0.12)' : 'transparent',
                        fontSize: '0.9rem'
                      }}
                    >
                      <MessageSquareText size={18} />
                      Feedback Usuarios
                    </Link>
                    <Link
                      href="/dashboard/administrador/respaldo"
                      onClick={() => setOpenMore(false)}
                      style={{
                        padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none', color: pathname === '/dashboard/administrador/respaldo' ? '#22c55e' : '#cbd5e1',
                        background: pathname === '/dashboard/administrador/respaldo' ? 'rgba(34,197,94,0.12)' : 'transparent',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Database size={18} />
                      Respaldo Base Datos
                    </Link>
                    <Link
                      href="/dashboard/administrador/almacenes"
                      onClick={() => setOpenMore(false)}
                      style={{
                        padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none', color: pathname === '/dashboard/administrador/almacenes' ? '#22c55e' : '#cbd5e1',
                        background: pathname === '/dashboard/administrador/almacenes' ? 'rgba(34,197,94,0.12)' : 'transparent',
                        fontSize: '0.9rem'
                      }}
                    >
                      <Warehouse size={18} />
                      Almacenes Firmware
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* PERFIL Y CERRAR SESIÓN */}
        <div ref={profileRef} className="profile-wrapper" style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenProfile(!openProfile)}
            title="Mi cuenta"
            style={{
              width: '44px', height: '44px', borderRadius: '50%', background: '#1e293b',
              border: '1px solid #334155', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#94a3b8', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '14px'
            }}
          >
            {initials}
          </button>

          {/* DROPDOWN FLOTANTE */}
          {openProfile && (
            <div className="dropdown-menu" style={{
              position: 'absolute', width: '210px', background: '#081420',
              border: '1px solid #1e293b', borderRadius: '16px', padding: '10px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.45)'
            }}>
              <Link
                href="/dashboard/agricultor/perfil"
                onClick={() => setOpenProfile(false)}
                style={{
                  width: '100%', background: 'transparent', textDecoration: 'none', color: '#cbd5e1',
                  padding: '12px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center',
                  gap: '10px', cursor: 'pointer', fontSize: '0.95rem', transition: 'all .2s ease',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <User size={18} />
                Mi Perfil
              </Link>
              <button
                onClick={async () => {
                  await signOut({ redirect: false });
                  window.location.href = '/auth/login';
                }}
                style={{
                  width: '100%', background: 'transparent', border: 'none', color: '#ef4444',
                  padding: '12px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center',
                  gap: '10px', cursor: 'pointer', fontSize: '0.95rem', transition: 'all .2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarButton({
  icon,
  active = false,
  href,
  title,
  className = '',
  onPrefetch,
}: {
  icon: React.ReactNode;
  active?: boolean;
  href: string;
  title?: string;
  className?: string;
  onPrefetch?: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      title={title}
      className={`nav-item ${active ? 'active' : ''} ${className}`}
      onMouseEnter={() => onPrefetch?.(href)}
      onFocus={() => onPrefetch?.(href)}
    >
      {icon}
    </Link>
  );
}
