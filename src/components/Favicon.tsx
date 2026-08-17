import { useState } from 'react';

interface Props {
  url: string;
  favicon?: string;
  className?: string;
}

/** Favicon de Google con fallback a un icono generico si la imagen falla (dominio raro, offline, etc). */
export function Favicon({ url, favicon, className }: Props) {
  const [broken, setBroken] = useState(false);

  if (!broken) {
    let hostname = url;
    try {
      hostname = new URL(url).hostname;
    } catch {
      // sin hostname valido, deja que falle el <img> y caiga al fallback
    }

    return (
      <img
        src={favicon ?? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
        alt=""
        className={className}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5v18l-6-3.6-6 3.6v-18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
