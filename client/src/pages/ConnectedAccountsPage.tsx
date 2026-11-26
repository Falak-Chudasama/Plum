import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Trash2,
  Star,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { MailboxItem } from '../lib/api';
import { useTheme } from '../components/ui/ThemeProvider';
import { useToast } from '../components/ui/ToastProvider';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  playEnter,
  playBack,
  playScroll,
} from '../lib/sound';

function formatTokenLifespan(mb: MailboxItem, nowMs: number) {
  const ttlDays = mb.refreshTokenTtlDays || 7;
  const ttlSec = ttlDays * 86400;

  let remainingSec: number;
  if (mb.status === 'expired' || mb.status === 'revoked' || !mb.hasRefreshToken || mb.tokenHealth === 'expired') {
    remainingSec = 0;
  } else if (mb.refreshTokenExpiresAt) {
    remainingSec = Math.max(0, Math.round((new Date(mb.refreshTokenExpiresAt).getTime() - nowMs) / 1000));
  } else if (typeof mb.refreshTokenRemainingSeconds === 'number') {
    remainingSec = Math.max(0, mb.refreshTokenRemainingSeconds);
  } else {
    remainingSec = ttlSec;
  }

  const ratio = Math.max(0, Math.min(1, remainingSec / ttlSec));
  // Smooth Green (138deg) -> Yellow-Amber (48deg) -> Red (0deg)
  const hue = Math.round(Math.pow(ratio, 0.68) * 138);

  let label: string;
  if (remainingSec <= 0) {
    label = 'Expired · Re-auth needed';
  } else if (remainingSec < 86400) {
    const hours = Math.floor(remainingSec / 3600);
    label = hours < 1 ? '<1h left before re-auth' : `${hours}h left before re-auth`;
  } else {
    const days = Math.floor(remainingSec / 86400);
    label = `${days}d left before re-auth`;
  }

  return {
    remainingSec,
    isExpired: remainingSec <= 0,
    ratio,
    hue,
    label,
  };
}

export function ConnectedAccountsPage() {
  const { mailboxes, activeMailbox, setActiveMailbox, refreshMailboxes, markMailboxExpired } = usePlumStore();
  const { isDark } = useTheme();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isConnecting, setIsConnecting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disconnectModalData, setDisconnectModalData] = useState<MailboxItem | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick every 60s so hour counters stay accurate without extra API requests
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const connectedEmail = searchParams.get('connected');
    const reauthorizedEmail = searchParams.get('reauthorized');

    if (connectedEmail) {
      toast.success(`Connected mailbox: ${connectedEmail}`);
      refreshMailboxes();
      setActiveMailbox(connectedEmail);
      searchParams.delete('connected');
      setSearchParams(searchParams, { replace: true });
    } else if (reauthorizedEmail) {
      toast.success(`Reauthorized ${reauthorizedEmail} with fresh tokens`);
      refreshMailboxes();
      setActiveMailbox(reauthorizedEmail);
      searchParams.delete('reauthorized');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, refreshMailboxes, setActiveMailbox, setSearchParams, toast]);

  const handleConnectNewAccount = async () => {
    playEnter();
    setIsConnecting(true);
    try {
      const authUrl = await api.getConnectUrl();
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
    } catch (err) {
      console.warn('API connect URL fetch failed, falling back:', err);
    }
    window.location.href = 'https://api.plum.jam/user/mailboxes/connect';
  };

  const handleReauthorize = async (mailbox: MailboxItem) => {
    playEnter();
    try {
      toast.info(`Opening Google authorization for ${mailbox.email}...`);
      const authUrl = await api.getConnectUrl(mailbox.email);
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
    } catch (err) {
      console.warn('API reauth URL fetch failed, falling back:', err);
    }
    window.location.href = `https://api.plum.jam/user/mailboxes/connect?mailboxEmail=${encodeURIComponent(mailbox.email)}`;
  };

  const handleRefreshToken = async (mailbox: MailboxItem) => {
    playEnter();
    setRefreshingId(mailbox.id);
    try {
      const res = await api.refreshMailboxToken(mailbox.id);
      if (res.isRefreshed) {
        toast.success(`Tokens refreshed for ${mailbox.email}`);
        refreshMailboxes();
      } else if (res.needsReauthorization && res.authUrl) {
        markMailboxExpired(mailbox.email);
        toast.warning('Google refresh token expired. Opening authorization...');
        window.location.href = res.authUrl;
      } else {
        toast.error(res.message || 'Token refresh failed.');
      }
    } catch {
      toast.error('Failed to refresh tokens with Google.');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleSetPrimary = async (mailbox: MailboxItem) => {
    playEnter();
    try {
      await api.setPrimaryMailbox(mailbox.id);
      toast.success(`${mailbox.email} set as primary`);
      refreshMailboxes();
    } catch {
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
    } catch {
      toast.error('Failed to disconnect mailbox.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never synced';
    const date = new Date(dateStr);
    const diffMins = Math.round((nowMs - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <PageShell
      title="Accounts"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              playScroll();
              refreshMailboxes();
            }}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            title="Refresh status"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnectNewAccount}
            disabled={isConnecting}
            isLoading={isConnecting}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Account
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {mailboxes.map((mb) => {
          const isActive = mb.email.toLowerCase() === activeMailbox.toLowerCase();
          const isRefreshingThis = refreshingId === mb.id;
          const tokenMeta = formatTokenLifespan(mb, nowMs);

          return (
            <Card
              key={mb.id}
              radius="2xl"
              elevation="none"
              className={`min-w-0 ${
                isActive
                  ? 'border-[#7E36B2]/35 dark:border-[#DBBFFF]/35'
                  : tokenMeta.isExpired
                  ? 'border-rose-400/50 dark:border-rose-700/60'
                  : ''
              }`}
            >
              {tokenMeta.isExpired && (
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="truncate">Google authorization expired. Reauthorize to sync and send.</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleReauthorize(mb)}
                    icon={<KeyRound className="h-3.5 w-3.5" />}
                  >
                    Reauthorize
                  </Button>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
                {/* Account Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="relative inline-flex shrink-0 mt-0.5 sm:mt-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] font-bold text-sm overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
                      {mb.picture ? (
                        <img src={mb.picture} alt="" className="h-full w-full object-cover" />
                      ) : (
                        mb.email[0].toUpperCase()
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#181915] ${
                        tokenMeta.isExpired ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-[14px] text-stone-900 dark:text-white truncate">
                        {mb.name || mb.email.split('@')[0]}
                      </span>

                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#7E36B2] dark:bg-[#DBBFFF] text-white dark:text-[#121310] px-2 py-0.5 text-[11px] font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}

                      {mb.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-semibold">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          Primary
                        </span>
                      )}
                    </div>

                    <div className="text-[13px] text-stone-500 dark:text-stone-400 truncate">
                      {mb.email}
                    </div>

                      {/* Sync timestamp + Clean Green->Red Refresh Token Countdown Pill */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs">
                      <span className="inline-flex items-center gap-1 text-stone-400 dark:text-stone-500">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Synced {formatLastSync(mb.lastSyncAt)}</span>
                      </span>

                      <span
                        data-token-lifespan-pill="true"
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          color: `hsl(${tokenMeta.hue}, 76%, ${isDark ? 68 : 34}%)`,
                          backgroundColor: `hsla(${tokenMeta.hue}, 82%, 48%, ${isDark ? 0.16 : 0.11})`,
                          borderColor: `hsla(${tokenMeta.hue}, 76%, 45%, ${isDark ? 0.34 : 0.28})`,
                        }}
                        title={
                          mb.refreshTokenExpiresAt
                            ? `Estimated re-auth window (${mb.refreshTokenTtlDays || 7}d) ends ${new Date(mb.refreshTokenExpiresAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`
                            : 'Google OAuth token status'
                        }
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: `hsl(${tokenMeta.hue}, 78%, ${isDark ? 60 : 45}%)` }}
                        />
                        <span>{tokenMeta.label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Flat Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-black/[0.05] dark:border-white/[0.06]">
                  <Button
                    variant={tokenMeta.isExpired ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleReauthorize(mb)}
                    icon={<KeyRound className="h-3.5 w-3.5" />}
                  >
                    Reauthorize
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRefreshToken(mb)}
                    disabled={isRefreshingThis}
                    isLoading={isRefreshingThis}
                    icon={<RefreshCw className={`h-3.5 w-3.5 ${isRefreshingThis ? 'animate-spin' : ''}`} />}
                  >
                    Refresh
                  </Button>

                  {!isActive && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        playEnter();
                        setActiveMailbox(mb.email);
                        toast.info(`Switched to ${mb.email}`);
                      }}
                      icon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      Use
                    </Button>
                  )}

                  {!mb.isPrimary && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetPrimary(mb)}
                      icon={<Star className="h-3.5 w-3.5" />}
                    >
                      Set Primary
                    </Button>
                  )}

                  {mailboxes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        playBack();
                        setDisconnectModalData(mb);
                      }}
                      className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      title="Disconnect"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={Boolean(disconnectModalData)}
        onClose={() => setDisconnectModalData(null)}
        onConfirm={confirmDisconnect}
        title="Disconnect Account"
        isDestructive
        isLoading={isDisconnecting}
        description={
          <span>
            Disconnect <strong className="text-stone-900 dark:text-white">{disconnectModalData?.email}</strong> from Plum?
          </span>
        }
      />
    </PageShell>
  );
}
