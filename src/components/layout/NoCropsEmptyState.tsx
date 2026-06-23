// src/components/layout/NoCropsEmptyState.tsx
import Link from 'next/link';
import { Flex, Card, Heading, Text } from '@radix-ui/themes';
import { Sprout } from 'lucide-react';

interface NoCropsEmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  href?: string;
}

export default function NoCropsEmptyState({
  title = "No tienes cultivos activos",
  description = "Para comenzar a monitorear condiciones de humedad, temperatura, consultar el historial de telemetría, configurar alertas o utilizar el riego inteligente por IA, debes registrar tu primer cultivo.",
  actionText = "Registrar Mi Primer Cultivo",
  onAction,
  href = "/dashboard/agricultor"
}: NoCropsEmptyStateProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatAnimation {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.15); }
          50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.35), 0 0 15px rgba(20, 184, 166, 0.15); }
          100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.15); }
        }

        @keyframes cardEntry {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .premium-empty-card {
          background: linear-gradient(135deg, rgba(7, 18, 30, 0.75) 0%, rgba(12, 28, 48, 0.75) 100%) !important;
          border: 1px solid rgba(34, 197, 94, 0.18) !important;
          border-radius: 28px !important;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 
                      0 0 40px rgba(34, 197, 94, 0.04) !important;
          animation: cardEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
          overflow: hidden;
          width: 100%;
        }

        .premium-empty-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .icon-container-glow {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%);
          border: 1.5px solid rgba(34, 197, 94, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #22c55e;
          animation: floatAnimation 4.5s ease-in-out infinite, pulseGlow 3s ease-in-out infinite;
          margin-bottom: 8px;
          z-index: 1;
        }

        .gradient-heading {
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 60%, #a7f3d0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
          text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        .premium-action-btn {
          background: linear-gradient(135deg, #22c55e 0%, #10b981 100%) !important;
          color: white !important;
          border: none !important;
          border-radius: 14px !important;
          font-weight: 600 !important;
          font-size: 0.95rem !important;
          cursor: pointer !important;
          box-shadow: 0 4px 18px rgba(34, 197, 94, 0.3) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          padding: 12px 28px !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .premium-action-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.45), 0 0 15px rgba(20, 184, 166, 0.25) !important;
          filter: brightness(1.1);
        }

        .premium-action-btn:active {
          transform: translateY(0) !important;
        }

        .bg-blob-green {
          position: absolute;
          width: 250px;
          height: 250px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.05);
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }

        .bg-blob-teal {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: rgba(20, 184, 166, 0.05);
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }
      ` }} />

      <Flex direction="column" align="center" justify="center" p="6" style={{ minHeight: '60vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Decoraciones de fondo */}
        <div className="bg-blob-green" style={{ top: '10%', left: '20%' }} />
        <div className="bg-blob-teal" style={{ bottom: '10%', right: '20%' }} />

        <Card size="3" className="premium-empty-card" style={{ maxWidth: '540px', padding: '32px 24px', zIndex: 1 }}>
          <Flex direction="column" gap="5" align="center">
            
            <div className="icon-container-glow">
              <Sprout size={38} strokeWidth={1.75} />
            </div>
            
            <Flex direction="column" gap="3" align="center" style={{ textAlign: 'center', zIndex: 1 }}>
              <Heading size="6" className="gradient-heading">
                {title}
              </Heading>
              <Text size="2" style={{ color: '#94a3b8', lineHeight: '1.6', maxWidth: '440px' }} as="p">
                {description}
              </Text>
            </Flex>

            {onAction ? (
              <button className="premium-action-btn" onClick={onAction}>
                {actionText}
              </button>
            ) : (
              <Link href={href} passHref style={{ textDecoration: 'none', display: 'inline-flex' }}>
                <button className="premium-action-btn">
                  {actionText}
                </button>
              </Link>
            )}

          </Flex>
        </Card>
      </Flex>
    </>
  );
}
