import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../components/ui/ThemeProvider';
import { ToastProvider } from '../components/ui/ToastProvider';
import { Header } from '../components/layout/Header';
import { DirectionalPageTransition } from '../components/layout/DirectionalPageTransition';
import { ComposerModal } from '../components/features/ComposerModal';
import { usePlumStore } from '../store/usePlumStore';

import { InboxPage } from '../pages/InboxPage';
import { SentPage } from '../pages/SentPage';
import { DraftsPage } from '../pages/DraftsPage';
import { ChatPage } from '../pages/ChatPage';
import { ConnectedAccountsPage } from '../pages/ConnectedAccountsPage';
import { SignInPage } from '../pages/SignInPage';

export default function App() {
  const { loadSession } = usePlumStore();
  const location = useLocation();

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const isAuthRoute = ['/signin', '/login', '/signup'].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="relative min-h-screen overflow-x-clip">
          {/* Ambient Desktop Web Refraction Orbs (Section 2.8: capped at 4% to 6% alpha, hidden on mobile) */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden sm:block" aria-hidden="true">
            <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#B266E6]/5 blur-[110px]" />
            <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#DBBFFF]/4 blur-[110px]" />
            <div className="absolute top-1/3 -right-20 h-[400px] w-[400px] rounded-full bg-[#B266E6]/3 blur-[110px]" />
          </div>

          <ComposerModal />
          {!isAuthRoute && <Header />}
          <DirectionalPageTransition>
            <Routes>
              {/* Main Fruit Application Pages */}
              <Route path="/" element={<Navigate to="/inbox" replace />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/sent" element={<SentPage />} />
              <Route path="/drafts" element={<DraftsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/accounts" element={<ConnectedAccountsPage />} />

              {/* Authentication */}
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/login" element={<SignInPage />} />
              <Route path="/signup" element={<SignInPage />} />

              {/* Backwards compatibility redirects */}
              <Route path="/home/:id" element={<Navigate to="/inbox" replace />} />
              <Route path="/home" element={<Navigate to="/inbox" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/inbox" replace />} />
            </Routes>
          </DirectionalPageTransition>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
