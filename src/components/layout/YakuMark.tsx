// Marca de Yaku ("agua" en quechua): una gota con un brote dentro.
// Trazo único en currentColor para que herede el color del contenedor.
export default function YakuMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {/* Gota */}
      <path d="M12 2.5c-3.6 4.3-6.5 8-6.5 11.4a6.5 6.5 0 0 0 13 0C18.5 10.5 15.6 6.8 12 2.5Z" />
      {/* Brote */}
      <path d="M12 18.5v-5" />
      <path d="M12 14.6c0-1.9 1.3-3.2 3.1-3.3-.1 1.9-1.3 3.2-3.1 3.3Z" />
      <path d="M12 15.8c0-1.6-1.1-2.7-2.6-2.8.1 1.6 1.1 2.7 2.6 2.8Z" />
    </svg>
  );
}
