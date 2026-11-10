import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '../components/ui/ThemeProvider';
import { ToastProvider } from '../components/ui/ToastProvider';
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

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return (
    <ThemeProvider>
      <ToastProvider>
        <ComposerModal />
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
      </ToastProvider>
    </ThemeProvider>
  );
}
