// Dialog pengesahan berkongsi (berasaskan Promise) — pengganti window.confirm
// dan prompt(). Mod textarea pilihan untuk mengutip sebab (cth penolakan).
//
// Guna:
//   const confirm = useConfirm();
//   const ok = await confirm({ title: 'Padam?', message: '...' });
//   const reason = await confirm({ title: 'Tolak', message: '...', textarea: {...} });
//   // textarea: ok === rentetan sebab; batal === null. tanpa textarea: boolean.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string; // lalai 'Sahkan'
  cancelLabel?: string; // lalai 'Batal'
  tone?: 'danger' | 'primary';
  textarea?: {
    label: string;
    placeholder?: string;
    required?: boolean; // lalai true
  };
}

type Resolver = (value: boolean | string | null) => void;

const ConfirmContext = createContext<
  ((opts: ConfirmOptions) => Promise<boolean | string | null>) | null
>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm mesti digunakan dalam <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [text, setText] = useState('');
  const resolver = useRef<Resolver | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setText('');
    return new Promise<boolean | string | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean | string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  // Papan kekunci: Escape menutup (batal); fokus dibawa ke dialog.
  useEffect(() => {
    if (!opts) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(opts.textarea ? null : false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts, close]);

  const required = opts?.textarea?.required ?? true;
  const canConfirm = !opts?.textarea || !required || text.trim().length > 0;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => close(opts.textarea ? null : false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={opts.title}
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  opts.tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{opts.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{opts.message}</p>
              </div>
            </div>

            {opts.textarea && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {opts.textarea.label}
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder={opts.textarea.placeholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                {required && text.trim().length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Sila nyatakan sebab.</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => close(opts.textarea ? null : false)}
                className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {opts.cancelLabel ?? 'Batal'}
              </button>
              <button
                onClick={() => close(opts.textarea ? text.trim() : true)}
                disabled={!canConfirm}
                className={`px-4 py-2.5 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
                  opts.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {opts.confirmLabel ?? 'Sahkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
