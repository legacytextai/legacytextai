import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

async function afterLoginBootstrap(session: Session | null) {
  if (!session?.user) return;

  try {
    // 1) Ensure users_app row exists/updated with email
    await supabase.rpc('ensure_user_self', { p_email: session.user.email ?? null });

    // 2) Check if user is active / has phone
    const { data: userData } = await supabase
      .from('users_app')
      .select('status, phone_e164')
      .single();

    const pendingPhone = session.user.user_metadata?.pending_phone_e164 || null;

    // 3) If no phone on record, but we have a pending phone from sign-up, auto-send OTP once
    if ((!userData?.phone_e164 || userData.phone_e164 === '') && pendingPhone) {
      const guardKey = `otpKickoff:${session.user.id}:${pendingPhone}`;
      if (!localStorage.getItem(guardKey)) {
        // Fire and forget; ignore failures (resend available on settings page)
        try {
          const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co/functions/v1/phone-change-initiate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_phone_e164: pendingPhone, auto: true })
          });
          console.log('Auto-sent OTP for pending phone:', response.status);
        } catch (error) {
          console.log('Failed to auto-send OTP:', error);
        }
        localStorage.setItem(guardKey, String(Date.now()));
      }
      
      // Route user to settings to enter the code (prefill phone input with pendingPhone)
      window.location.href = '/settings?verifyPhone=1';
      return;
    }

    // Otherwise route to dashboard normally
    if (window.location.pathname === '/auth' || window.location.pathname === '/') {
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Bootstrap error:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

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
          setTimeout(() => {
            if (mounted) afterLoginBootstrap(session);
          }, 0);
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
      if (session) {
        setTimeout(() => {
          if (mounted) afterLoginBootstrap(session);
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