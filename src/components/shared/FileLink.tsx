// Pautan fail baldi 'uploads' (peribadi): URL bertandatangan dijana hanya
// apabila pengguna klik, kemudian dibuka dalam tab baharu. Menerima laluan
// storan baharu mahupun URL awam lama (getFileUrl menyokong kedua-duanya).
import React, { useState } from 'react';
import { getFileUrl } from '../../services/dataService';

export default function FileLink({
  stored,
  children,
  className,
  title,
}: {
  stored: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  const open = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(false);
    try {
      const url = await getFileUrl(stored);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('FileLink:', error);
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <a
      href="#"
      onClick={open}
      className={className}
      title={err ? 'Gagal membuka fail. Sila cuba semula.' : title}
      aria-busy={busy}
    >
      {children}
      {err && <span className="ml-2 text-xs text-red-600">Gagal membuka fail — cuba semula.</span>}
    </a>
  );
}
