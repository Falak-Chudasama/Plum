import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import plumLogo from '../assets/plum-icon.svg';
import constants from '../constants/constants';
import { api } from '../lib/api';
import { usePlumStore } from '../store/usePlumStore';
import { useToast } from '../components/ui/ToastProvider';

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { loadSession } = usePlumStore();
  const [isLoading, setIsLoading] = useState(false);

  const warning = searchParams.get('warning');

  const handleGoogleSignIn = () => {
    window.location.href = constants.googleAuthUrl + new URLSearchParams(constants.googleAuthRequestUrl);
  };

  // Quick sign-in helper for verified existing accounts during testing
  const handleQuickLogin = async (email: string, fName: string, lName: string) => {
    setIsLoading(true);
    try {
      await api.login(email, fName, lName);
      await loadSession();
      toast.success(`Signed in as ${email}`);
      navigate('/inbox');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9F5] dark:bg-[#121310] px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white dark:bg-[#181915] p-2.5 shadow-floating border border-black/[0.06] dark:border-white/[0.08]">
            <div className="absolute inset-0 rounded-3xl bg-[#B266E6]/10 blur-xl" />
            <img src={plumLogo} alt="Plum" className="relative h-11 w-11 object-contain" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-stone-900 dark:text-white">
              Plum
            </h1>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 font-medium">
              Intelligent Email & Productivity Gateway
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Google authorization was canceled or timed out. Please try again.</span>
          </div>
        )}

        {/* Auth Card */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] p-7 shadow-lift space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-sm font-bold text-stone-900 dark:text-white">
              Access Your Workspace
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Sign in with your Google account to connect your mailboxes and enable AI email intelligence.
            </p>
          </div>

          {/* Primary CTA: Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="focus-ring w-full flex items-center justify-center gap-3 rounded-2xl border border-black/[0.1] dark:border-white/[0.12] bg-stone-900 hover:bg-stone-800 text-white dark:bg-white dark:hover:bg-stone-100 dark:text-stone-900 py-3 px-4 text-xs font-semibold shadow-soft transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Quick Workspace Switch for verified accounts */}
          <div className="pt-4 border-t border-black/[0.05] dark:border-white/[0.06] space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Direct Workspace Access (Falak Chudasama)
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('falak.chudasama@somaiya.edu', 'Falak', 'Chudasama')}
                disabled={isLoading}
                className="focus-ring flex items-center justify-between rounded-xl border border-black/[0.06] dark:border-white/[0.08] p-2.5 text-left text-xs hover:border-[#B266E6] hover:bg-[#B266E6]/5 transition disabled:opacity-50"
              >
                <div>
                  <div className="font-semibold text-stone-900 dark:text-white">
                    College Workspace
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    falak.chudasama@somaiya.edu
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#B266E6]" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('falakchudasama7766@gmail.com', 'Falak', 'Chudasama')}
                disabled={isLoading}
                className="focus-ring flex items-center justify-between rounded-xl border border-black/[0.06] dark:border-white/[0.08] p-2.5 text-left text-xs hover:border-[#B266E6] hover:bg-[#B266E6]/5 transition disabled:opacity-50"
              >
                <div>
                  <div className="font-semibold text-stone-900 dark:text-white">
                    Personal Workspace
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    falakchudasama7766@gmail.com
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#B266E6]" />
              </button>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-center justify-center gap-2 text-center text-[11px] text-stone-400 dark:text-stone-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>OAuth 2.0 Multi-Account Isolation • LLM Inference via Basket</span>
        </div>
      </div>
    </div>
  );
}

