import React, { useState } from 'react';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppProvider, useApp } from './app/AppContext';
import { TopNav } from './components/layout/TopNav';
import { ActivityLogDrawer } from './components/layout/ActivityLogDrawer';
import { InfoModal } from './components/layout/InfoModal';
import { Workspace } from './pages/Workspace';

const WorkspaceShell: React.FC = () => {
  const { statusBanner, clearStatusBanner } = useApp();

  const bannerStyles = {
    info: {
      bg: 'bg-[#EAE2F2] border-[#D2C2E4] text-[#4E3471]',
      Icon: Info,
    },
    success: {
      bg: 'bg-[#BDE0C4]/65 border-[#95C99F] text-[#204B36]',
      Icon: CheckCircle2,
    },
    warning: {
      bg: 'bg-[#F5DFBA] border-[#E2C28E] text-[#664212]',
      Icon: AlertTriangle,
    },
    error: {
      bg: 'bg-[#F4DAD6] border-[#DFB3AC] text-[#732820]',
      Icon: AlertCircle,
    },
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6">
      {statusBanner && (
        <div
          role="status"
          className={`mb-3 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-xs font-medium ${bannerStyles[statusBanner.kind].bg}`}
        >
          <div className="flex items-center gap-2">
            {React.createElement(bannerStyles[statusBanner.kind].Icon, {
              className: 'h-3.5 w-3.5 shrink-0',
              'aria-hidden': true,
            })}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={clearStatusBanner}
            aria-label="Dismiss notification"
            className="cs-focus-ring rounded p-1 hover:bg-[#26352D]/10"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <Workspace />
    </main>
  );
};

export const App: React.FC = () => {
  const [logOpen, setLogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#F5F0E6] text-[#26352D]">
        <TopNav
          onOpenLog={() => setLogOpen(true)}
          onOpenInfo={() => setInfoOpen(true)}
        />
        <WorkspaceShell />
        <footer className="mx-auto max-w-[1440px] px-4 pb-4 pt-1 text-[11px] text-[#5B6058] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>CLEARSHARE — Memory-only browser workspace · Zero external transmission</span>
            <span>Exposure indicators are rule-based and do not guarantee anonymity</span>
          </div>
        </footer>
        <ActivityLogDrawer open={logOpen} onClose={() => setLogOpen(false)} />
        <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </AppProvider>
  );
};

export default App;
