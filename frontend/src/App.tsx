import React, { useState } from 'react';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AppProvider, useApp } from './app/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { ActivityLogDrawer } from './components/layout/ActivityLogDrawer';
import { InfoModal } from './components/layout/InfoModal';
import { ErrorAlert } from './components/ui/ErrorAlert';
import { Workspace } from './pages/Workspace';
import { DocumentAnalysisPage } from './pages/DocumentAnalysisPage';
import { PrivacySimulatorPage } from './pages/PrivacySimulatorPage';
import { ComparisonReviewPage } from './pages/ComparisonReviewPage';
import { VerificationReportingPage } from './pages/VerificationReportingPage';
import { ExportReportingPage } from './pages/ExportReportingPage';

const WorkspaceShell: React.FC = () => {
  const { activeScreen, statusBanner, clearStatusBanner, appError, clearAppError } = useApp();

  const bannerStyles = {
    info: {
      bg: 'bg-lavender border-[#D2C2E4] text-royal-hover',
      Icon: Info,
    },
    success: {
      bg: 'bg-status-success/65 border-[#95C99F] text-forest-hover',
      Icon: CheckCircle2,
    },
    warning: {
      bg: 'bg-status-warning border-[#E2C28E] text-[#664212]',
      Icon: AlertTriangle,
    },
    error: {
      bg: 'bg-status-error border-[#DFB3AC] text-[#732820]',
      Icon: AlertCircle,
    },
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6">
      {appError && (
        <div className="mb-3">
          <ErrorAlert error={appError} onDismiss={clearAppError} />
        </div>
      )}

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
            className="cs-focus-ring rounded p-1 hover:bg-ink/10"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {activeScreen === 'workspace' && <Workspace />}
      {activeScreen === 'analysis' && <DocumentAnalysisPage />}
      {activeScreen === 'simulator' && <PrivacySimulatorPage />}
      {activeScreen === 'comparison' && <ComparisonReviewPage />}
      {activeScreen === 'verification' && <VerificationReportingPage />}
      {activeScreen === 'export' && <ExportReportingPage />}
    </main>
  );
};

export const App: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <AppProvider>
      <div className="flex min-h-screen bg-cream text-ink">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onOpenLog={() => {
            setMobileNavOpen(false);
            setLogOpen(true);
          }}
          onOpenInfo={() => {
            setMobileNavOpen(false);
            setInfoOpen(true);
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
          <WorkspaceShell />
          <footer className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-1 text-[11px] text-muted sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-warm-border pt-3">
              <span>CLEARSHARE — Memory-only browser workspace · Zero external transmission</span>
              <span>Exposure indicators are rule-based and do not guarantee anonymity</span>
            </div>
          </footer>
        </div>

        <ActivityLogDrawer open={logOpen} onClose={() => setLogOpen(false)} />
        <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </AppProvider>
  );
};

export default App;
