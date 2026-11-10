import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mail,
  ShieldCheck,
  Plus,
  RefreshCw,
  Trash2,
  Star,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { MailboxItem } from '../lib/api';
import { useToast } from '../components/ui/ToastProvider';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

export function ConnectedAccountsPage() {
  const { user, mailboxes, activeMailbox, setActiveMailbox, refreshMailboxes } = usePlumStore();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isConnecting, setIsConnecting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disconnectModalData, setDisconnectModalData] = useState<MailboxItem | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check for successful OAuth callback query params (connected or reauthorized)
  useEffect(() => {
    const connectedEmail = searchParams.get('connected');
    const reauthorizedEmail = searchParams.get('reauthorized');

    if (connectedEmail) {
      toast.success(`Successfully connected mailbox: ${connectedEmail}`);
      refreshMailboxes();
      setActiveMailbox(connectedEmail);
      searchParams.delete('connected');
      setSearchParams(searchParams, { replace: true });
    } else if (reauthorizedEmail) {
      toast.success(`Successfully reauthorized ${reauthorizedEmail} with fresh Google tokens!`);
      refreshMailboxes();
      setActiveMailbox(reauthorizedEmail);
      searchParams.delete('reauthorized');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, refreshMailboxes, setActiveMailbox, setSearchParams, toast]);

  const handleConnectNewAccount = async () => {
    setIsConnecting(true);
    try {
      const authUrl = await api.getConnectUrl();
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
    } catch (err: any) {
      console.warn('API connect URL fetch failed, falling back to direct redirect:', err);
    }
    // Fallback: direct browser redirect to backend connect endpoint
    window.location.href = 'https://api.plum.com/user/mailboxes/connect';
  };

  const handleReauthorize = async (mailbox: MailboxItem) => {
    try {
      toast.info(`Redirecting to Google to reauthorize ${mailbox.email}...`);
      const authUrl = await api.getConnectUrl(mailbox.email);
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
    } catch (err: any) {
      console.warn('API reauth URL fetch failed, falling back to direct redirect:', err);
    }
    window.location.href = `https://api.plum.com/user/mailboxes/connect?mailboxEmail=${encodeURIComponent(mailbox.email)}`;
  };

  const handleRefreshToken = async (mailbox: MailboxItem) => {
    setRefreshingId(mailbox.id);
    try {
      const res = await api.refreshMailboxToken(mailbox.id);
      if (res.isRefreshed) {
        toast.success(`Tokens successfully refreshed for ${mailbox.email}!`);
        refreshMailboxes();
      } else if (res.needsReauthorization && res.authUrl) {
        toast.warning(`Google refresh token expired. Opening Google authorization...`);
        window.location.href = res.authUrl;
      } else {
        toast.error(res.message || 'Token refresh failed.');
      }
    } catch (err: any) {
      toast.error('Failed to refresh tokens with Google.');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleTestConnection = async (mailbox: MailboxItem) => {
    setTestingId(mailbox.id);
    try {
      const res = await api.getMailboxStatus(mailbox.id);
      if (res.isLive) {
        toast.success(`Connection verified for ${mailbox.email}! Tokens are fresh and healthy.`);
      } else {
        toast.warning(`Token requires re-authorization for ${mailbox.email}. Click "Reauthorize" to renew.`);
      }
      refreshMailboxes();
    } catch (err: any) {
      toast.error(`Health check failed for ${mailbox.email}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleSetPrimary = async (mailbox: MailboxItem) => {
    try {
      await api.setPrimaryMailbox(mailbox.id);
      toast.success(`${mailbox.email} is now your primary mailbox.`);
      refreshMailboxes();
    } catch (err: any) {
      toast.error('Failed to set primary mailbox.');
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectModalData) return;
    setIsDisconnecting(true);
    try {
      await api.disconnectMailbox(disconnectModalData.id);
      toast.success(`Disconnected ${disconnectModalData.email}`);
      setDisconnectModalData(null);
      await refreshMailboxes();
    } catch (err: any) {
      toast.error('Failed to disconnect mailbox.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never synced';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.round((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <PageShell
      title="Connected Gmail Accounts"
      subtitle="Manage linked Gmail accounts, check OAuth token freshness, and switch your active mailbox context."
      action={
        <button
          type="button"
          onClick={handleConnectNewAccount}
          disabled={isConnecting}
          className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-4 py-2 text-xs font-semibold shadow-soft transition disabled:opacity-50"
        >
          {isConnecting ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span>Connect Gmail Account</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* List of Connected Accounts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Linked Mailboxes ({mailboxes.length})
            </h2>
            <button
              type="button"
              onClick={() => refreshMailboxes()}
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {mailboxes.map((mb) => {
              const isActive = mb.email === activeMailbox;
              const isCheckingThis = testingId === mb.id;
              const isRefreshingThis = refreshingId === mb.id;
              const isExpired = mb.status === 'expired';

              return (
                <div
                  key={mb.id}
                  className={`rounded-2xl border p-5 transition-all shadow-soft ${
                    isActive
                      ? 'border-[#B266E6]/40 bg-[#B266E6]/[0.03] dark:bg-[#B266E6]/[0.05] ring-1 ring-[#B266E6]/20'
                      : isExpired
                      ? 'border-amber-300 dark:border-amber-700/60 bg-amber-500/[0.02]'
                      : 'border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915]'
                  }`}
                >
                  {isExpired && (
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span><strong>Token Renewal Required:</strong> Google authorization has lapsed. Click <strong>Reauthorize</strong> to grant fresh tokens without re-adding the account.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReauthorize(mb)}
                        className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3.5 py-1.5 text-xs transition shadow-2xs"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Reauthorize Now</span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Mailbox Details */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="relative inline-flex shrink-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] font-bold text-sm overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
                          {mb.picture ? (
                            <img src={mb.picture} alt="" className="h-full w-full object-cover" />
                          ) : (
                            mb.email[0].toUpperCase()
                          )}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-[#181915] z-10 ${
                            mb.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-stone-900 dark:text-white truncate">
                            {mb.name || mb.email.split('@')[0]}
                          </span>

                          {/* Active Context Badge */}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#B266E6] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
                              <CheckCircle2 className="h-3 w-3" />
                              Active Context
                            </span>
                          )}

                          {/* Primary Badge */}
                          {mb.isPrimary && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
                              <Star className="h-3 w-3 fill-amber-500" />
                              Primary
                            </span>
                          )}

                          {/* Status Badge */}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              mb.status === 'connected'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold'
                            }`}
                          >
                            {mb.status === 'connected' ? 'Connected' : 'Needs Reauthorization'}
                          </span>
                        </div>

                        <div className="text-xs text-stone-600 dark:text-stone-300 font-medium truncate mt-0.5">
                          {mb.email}
                        </div>

                        {/* Token Health & Last Sync */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-400 dark:text-stone-500">
                          <span className="flex items-center gap-1">
                            {mb.status === 'connected' ? (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-stone-600 dark:text-stone-300">Refresh Token Active (Permanent Offline Sync)</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">Authorization Lapsed — Reauthorization Required</span>
                              </>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Last synced: {formatLastSync(mb.lastSyncAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.05] dark:border-white/[0.06]">
                      {/* Primary Reauthorize / Refresh Action */}
                      <button
                        type="button"
                        onClick={() => handleReauthorize(mb)}
                        className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition shadow-xs ${
                          isExpired
                            ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                            : 'border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        }`}
                        title="Sign in with Google to grant fresh tokens for this mailbox"
                      >
                        <KeyRound className={`h-3.5 w-3.5 ${isExpired ? 'text-white' : 'text-stone-500'}`} />
                        <span>Reauthorize</span>
                      </button>

                      {/* Immediate Refresh Token attempt */}
                      <button
                        type="button"
                        onClick={() => handleRefreshToken(mb)}
                        disabled={isRefreshingThis}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition disabled:opacity-50"
                        title="Attempt refreshing Google access token"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingThis ? 'animate-spin' : ''}`} />
                        <span>{isRefreshingThis ? 'Refreshing...' : 'Refresh Token'}</span>
                      </button>

                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMailbox(mb.email);
                            toast.info(`Switched active mailbox to ${mb.email}`);
                          }}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white px-3 py-1.5 text-xs font-semibold transition"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          <span>Make Active</span>
                        </button>
                      )}

                      {!mb.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(mb)}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                          title="Set as default primary account"
                        >
                          <Star className="h-3.5 w-3.5 text-stone-400" />
                          <span>Set Primary</span>
                        </button>
                      )}

                      {mailboxes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDisconnectModalData(mb)}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                          title="Disconnect this Gmail mailbox"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Disconnect</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Account Guidance Card */}
        <div className="rounded-2xl border border-dashed border-black/[0.1] dark:border-white/[0.12] p-6 text-center bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF]">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-stone-900 dark:text-white">
            Link Another Gmail Mailbox
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-stone-500 dark:text-stone-400">
            Sign in with another Google account to link personal, college, or team mailboxes. Plum isolates credentials per account so your data never mixes.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleConnectNewAccount}
              disabled={isConnecting}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-2 text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{isConnecting ? 'Opening Google Sign-In...' : 'Add Google Account'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(disconnectModalData)}
        onClose={() => setDisconnectModalData(null)}
        onConfirm={confirmDisconnect}
        title="Disconnect Mailbox"
        description={
          <div>
            Are you sure you want to disconnect <strong className="text-stone-900 dark:text-white">{disconnectModalData?.email}</strong>?
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              This will remove Plum's access tokens for this mailbox. Your emails on Gmail will not be deleted, but Plum will no longer sync correspondence for this address.
            </p>
          </div>
        }
        confirmLabel="Disconnect"
        isDestructive={true}
        isLoading={isDisconnecting}
      />
    </PageShell>
  );
}
