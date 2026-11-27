import React, { useState } from 'react';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppProvider, useApp } from './app/AppContext';
import { TopNav } from './components/layout/TopNav';
import { ActivityLogDrawer } from './components/layout/ActivityLogDrawer';
import { Workspace } from './pages/Workspace';
import { AnalysisStudio } from './pages/AnalysisStudio';
import { ExposureSimulator } from './pages/ExposureSimulator';
import { ComparisonStudio } from './pages/ComparisonStudio';
import { ReviewExport } from './pages/ReviewExport';

const ScreenRouter: React.FC = () => {
  const { activeScreen, statusBanner, clearStatusBanner } = useApp();

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
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {statusBanner && (
        <div
          role="status"
          className={`mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${bannerStyles[statusBanner.kind].bg}`}
        >
          <div className="flex items-center gap-2.5">
            {React.createElement(bannerStyles[statusBanner.kind].Icon, {
              className: 'h-4 w-4 shrink-0',
              'aria-hidden': true,
            })}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={clearStatusBanner}
            aria-label="Dismiss notification"
            className="cs-focus-ring rounded-md p-1 hover:bg-[#26352D]/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {activeScreen === 'workspace' && <Workspace />}
      {activeScreen === 'analysis' && <AnalysisStudio />}
      {activeScreen === 'simulator' && <ExposureSimulator />}
      {activeScreen === 'comparison' && <ComparisonStudio />}
      {activeScreen === 'export' && <ReviewExport />}
    </main>
  );
};

export const App: React.FC = () => {
  const [logOpen, setLogOpen] = useState(false);

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#F5F0E6] text-[#26352D]">
        <TopNav onOpenLog={() => setLogOpen(true)} />
        <ScreenRouter />
        <footer className="mx-auto max-w-7xl border-t border-[#E8E2D8] px-4 py-5 text-xs text-[#5B6058] sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>CLEARSHARE — Client-Side Privacy Intelligence & Exposure Simulation</span>
            <span>No server uploads · Memory-only processing · Not a guarantee of anonymity</span>
          </div>
        </footer>
        <ActivityLogDrawer open={logOpen} onClose={() => setLogOpen(false)} />
      </div>
    </AppProvider>
  );
};

export default App;
