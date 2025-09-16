import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAutoOtp } from '@/utils/debugConfig';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  authReady: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

let __didAutoKickoff = false;

export async function afterLoginBootstrap(navigate: (path: string) => void) {
  console.log('[afterLoginBootstrap] Starting bootstrap process');
  
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[afterLoginBootstrap] No user found, redirecting to auth');
    navigate('/auth');
    return;
  }

  console.log('[afterLoginBootstrap] User found:', user.id);

  try {
    // 1) Ensure users_app row exists/updated with email
    console.log('[afterLoginBootstrap] Ensuring user_self with email:', user.email);
    const ensureResult = await supabase.rpc('ensure_user_self', { p_email: user.email ?? null });
    console.log('[afterLoginBootstrap] ensure_user_self result:', ensureResult);

    // 2) Check if user is active / has phone (get current user's record only)
    const { data: userData, error: userDataError } = await supabase
      .from('users_app')
      .select('status, phone_e164')
      .eq('auth_user_id', user.id)
      .limit(1);

    if (userDataError) {
      console.error('[afterLoginBootstrap] Error fetching user data:', userDataError);
    } else {
      console.log('[afterLoginBootstrap] User data:', userData?.[0]);
    }

    const pendingPhone = user.user_metadata?.pending_phone_e164 || null;
    const needVerify = (!userData?.[0]?.phone_e164 || userData[0].phone_e164 === '') && pendingPhone;
    
    console.log('[afterLoginBootstrap] Phone verification check:', {
      currentPhone: userData?.[0]?.phone_e164,
      pendingPhone,
      needVerify,
      autoOtpEnabled: getAutoOtp(),
    });

    // 3) If no phone on record, but we have a pending phone from sign-up, auto-send OTP once
    const autoEnabled = getAutoOtp();
    if (needVerify && autoEnabled && !__didAutoKickoff) {
      __didAutoKickoff = true; // in-memory guard
      const guardKey = `otpKickoff:${user.id}:${pendingPhone}`;
      
      if (!localStorage.getItem(guardKey)) {
        console.log('[afterLoginBootstrap] Attempting auto OTP send for:', pendingPhone);
        
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          
          console.log('[afterLoginBootstrap] OTP Request details:', {
            url: 'https://toxadhuqzdydliplhrws.supabase.co/functions/v1/phone-change-initiate',
            headers: { 'Authorization': `Bearer ${token?.substring(0, 20)}...` },
            body: { new_phone_e164: pendingPhone, auto: true },
          });
          
          const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co/functions/v1/phone-change-initiate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_phone_e164: pendingPhone, auto: true })
          });
          
          const responseData = await response.json().catch(() => ({}));
          console.log('[afterLoginBootstrap] Auto OTP response:', {
            status: response.status,
            data: responseData,
          });

          // If auto OTP fails, just log it - don't try to update database from client
          if (!response.ok || !responseData.ok) {
            console.warn('[afterLoginBootstrap] Auto OTP failed:', {
              status: response.status,
              data: responseData,
              error: responseData.error || 'Unknown error'
            });
          }
          
        } catch (error) {
          console.error('[afterLoginBootstrap] Failed to auto-send OTP:', error);
        }
        
        localStorage.setItem(guardKey, String(Date.now()));
      } else {
        console.log('[afterLoginBootstrap] Auto OTP already sent (localStorage guard)');
      }
      
      // Route user to settings to enter the code (prefill phone input with pendingPhone)
      console.log('[afterLoginBootstrap] Routing to settings for phone verification');
      navigate('/settings?verifyPhone=1');
      return;
    }

    if (needVerify && !autoEnabled) {
      console.log('[afterLoginBootstrap] Phone verification needed but auto OTP disabled, routing to settings');
      navigate('/settings?verifyPhone=1');
      return;
    }

    // Otherwise route to dashboard normally
    console.log('[afterLoginBootstrap] Routing to dashboard');
    navigate('/dashboard');
  } catch (error) {
    console.error('[afterLoginBootstrap] Bootstrap error:', error);
    // Still try to route somewhere on error
    navigate('/dashboard');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapInProgress, setBootstrapInProgress] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setAuthReady(true);
        
        // Bootstrap after state change (defer to avoid deadlocks)
        if (session && event === 'SIGNED_IN') {
          // Don't auto-redirect from auth callback page or test pages
          const isTestPage = window.location.pathname.startsWith('/test/');
          if (window.location.pathname !== '/auth/callback' && !isTestPage && !bootstrapInProgress) {
            setBootstrapInProgress(true);
            setTimeout(() => {
              if (mounted) {
                afterLoginBootstrap(navigate).finally(() => {
                  if (mounted) setBootstrapInProgress(false);
                });
              }
            }, 0);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setAuthReady(true);
      
      // Bootstrap on initial load if session exists
      const isTestPage = window.location.pathname.startsWith('/test/');
      if (session && window.location.pathname !== '/auth/callback' && !isTestPage && !bootstrapInProgress) {
        setBootstrapInProgress(true);
        setTimeout(() => {
          if (mounted) {
            afterLoginBootstrap(navigate).finally(() => {
              if (mounted) setBootstrapInProgress(false);
            });
          }
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, authReady }}>
      {children}
    </AuthContext.Provider>
  );
}