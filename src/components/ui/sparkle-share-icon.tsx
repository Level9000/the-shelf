export function SparkleShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Share tray base */}
      <path
        d="M4 13.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Arrow shaft */}
      <path
        d="M10 11.5V4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Arrow head */}
      <path
        d="M7 6.5L10 3.5L13 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Large sparkle — top right */}
      <path
        d="M16 2.5 L16.4 4 L17.5 4 L16.6 4.9 L17 6.5 L16 5.7 L15 6.5 L15.4 4.9 L14.5 4 L15.6 4 Z"
        fill="currentColor"
        strokeWidth="0"
      />
      {/* Small sparkle — mid left */}
      <path
        d="M3 7.5 L3.25 8.4 L4 8.4 L3.4 8.9 L3.6 9.8 L3 9.3 L2.4 9.8 L2.6 8.9 L2 8.4 L2.75 8.4 Z"
        fill="currentColor"
        strokeWidth="0"
      />
    </svg>
  );
}
