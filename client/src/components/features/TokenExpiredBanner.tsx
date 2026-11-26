import { AlertTriangle, KeyRound } from 'lucide-react';
import { api } from '../../lib/api';
import { usePlumStore } from '../../store/usePlumStore';
import { Button } from '../ui/Button';
import { playEnter } from '../../lib/sound';

interface TokenExpiredBannerProps {
  className?: string;
}

/**
 * Displays a unified re-authorization banner across workspace pages whenever
 * the active mailbox's Google OAuth token has expired or been revoked.
 */
export function TokenExpiredBanner({ className = '' }: TokenExpiredBannerProps) {
  const { mailboxes, activeMailbox } = usePlumStore();
  const activeMb = mailboxes.find((m) => m.email.toLowerCase() === activeMailbox.toLowerCase());

  const isExpired =
    Boolean(activeMb) &&
    (activeMb?.status === 'expired' ||
      activeMb?.status === 'revoked' ||
      activeMb?.tokenHealth === 'expired' ||
      !activeMb?.hasRefreshToken);

  if (!isExpired || !activeMailbox) return null;

  const handleReauth = async () => {
    playEnter();
    try {
      const authUrl = await api.getConnectUrl(activeMailbox);
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
    } catch {
      // Fallback to direct backend endpoint
    }
    window.location.href = `https://api.plum.jam/user/mailboxes/connect?mailboxEmail=${encodeURIComponent(activeMailbox)}`;
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-[13px] text-rose-700 dark:text-rose-300 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Google authorization expired for <strong>{activeMailbox}</strong>. Reauthorize to sync &amp; send.
        </span>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={handleReauth}
        icon={<KeyRound className="h-3.5 w-3.5" />}
      >
        Reauthorize
      </Button>
    </div>
  );
}
