// Pemberitahuan toast berkongsi — satu pelaksanaan untuk seluruh aplikasi
// (menggantikan empat salinan showNotification yang serupa).
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastContextValue {
  showNotification: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useNotification(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useNotification mesti digunakan dalam <ToastProvider>');
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((message: string, type: ToastType) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showNotification }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <p className="font-semibold text-sm">{toast.message}</p>
        </div>
      )}
    </ToastContext.Provider>
  );
}
