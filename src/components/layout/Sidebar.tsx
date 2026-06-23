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
  Brain,
  LogOut,
  Shield,
  Users,
  Cpu,
  MapPin,
  Database,
  User,
  Warehouse,
  HardDriveUpload
} from 'lucide-react';

export default function Sidebar({ initials = "JR" }: { initials?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openProfile, setOpenProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.rol === 'administrador';
  const isFarmer = (session?.user as any)?.rol === 'agricultor';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpenProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            height: 72px;
            flex-direction: row;
            justify-content: space-evenly;
            padding: 0 8px;
            border-radius: 24px 24px 0 0;
            border-bottom: none;
          }
          .sidebar-logo { display: none !important; }
          .sidebar-menu {
            display: contents !important;
          }
          .profile-wrapper { 
            margin-top: 0 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .dropdown-menu {
            bottom: 72px;
            right: 0;
            left: auto !important;
          }
          /* Indicador activo abajo en móvil */
          .nav-item.active::before {
            content: '';
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 16px;
            height: 3px;
            background-color: #22c55e;
            border-radius: 2px;
          }
        }

        /* --- DESKTOP (Barra Lateral Izquierda) --- */
        @media (min-width: 1000px) {
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
              <SidebarButton href="/dashboard/agricultor" active={pathname === '/dashboard/agricultor'} icon={<LayoutDashboard size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/agricultor/historico" active={pathname?.includes('/historico')} icon={<BarChart3 size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/agricultor/alertas" active={pathname?.includes('/alertas')} icon={<Bell size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/agricultor/control" active={pathname?.includes('/control')} icon={<Settings size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/agricultor/ml" active={pathname?.includes('/ml')} icon={<Brain size={22} />} onPrefetch={router.prefetch} />
            </>
          )}
          {isAdmin && (
            <>
              <SidebarButton href="/dashboard/administrador" active={pathname === '/dashboard/administrador'} icon={<LayoutDashboard size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/administrador/usuarios" active={pathname === '/dashboard/administrador/usuarios'} icon={<Users size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/administrador/dispositivos" active={pathname === '/dashboard/administrador/dispositivos'} icon={<Cpu size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/administrador/firmware" active={pathname === '/dashboard/administrador/firmware'} icon={<HardDriveUpload size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/administrador/catalogo" active={pathname === '/dashboard/administrador/catalogo'} icon={<MapPin size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/administrador/respaldo" active={pathname === '/dashboard/administrador/respaldo'} icon={<Database size={22} />} onPrefetch={router.prefetch} />
              <SidebarButton href="/dashboard/administrador/almacenes" active={pathname === '/dashboard/administrador/almacenes'} icon={<Warehouse size={22} />} onPrefetch={router.prefetch} />
            </>
          )}
        </div>

        {/* PERFIL Y CERRAR SESIÓN */}
        <div ref={profileRef} className="profile-wrapper" style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenProfile(!openProfile)}
            style={{
              width: '46px', height: '46px', borderRadius: '50%', background: '#1e293b',
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
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
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
  onPrefetch,
}: {
  icon: React.ReactNode;
  active?: boolean;
  href: string;
  onPrefetch?: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={`nav-item ${active ? 'active' : ''}`}
      onMouseEnter={() => onPrefetch?.(href)}
      onFocus={() => onPrefetch?.(href)}
    >
      {icon}
    </Link>
  );
}
