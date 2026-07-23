// Sempadan ralat aplikasi — menghalang skrin putih apabila render melempar.
import React from 'react';

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Ralat aplikasi:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
            <h1 className="text-xl font-bold text-slate-900">Maaf, berlaku ralat.</h1>
            <p className="text-sm text-slate-500 mt-2">
              Sila muat semula halaman. Jika masalah berterusan, hubungi pentadbir portal.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Muat Semula
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
