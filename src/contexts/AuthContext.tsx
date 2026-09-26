import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, Wallet } from '../types/database';

type UserProfile = Profile;
type UserWallet = Wallet;

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  wallet: UserWallet | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signUp: (contact: string, password: string, userType: 'worker' | 'client', verificationMethod: 'email' | 'phone') => Promise<{ error: string | null; needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  sendVerificationCode: (contact: string, method: 'email' | 'phone') => Promise<{ error: string | null }>;
  resendSignupConfirmation: (contact: string, method: 'email' | 'phone') => Promise<{ error: string | null }>;
  verifyVerificationCode: (contact: string, code: string, method: 'email' | 'phone') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    wallet: null,
    session: null,
    loading: true,
    error: null,
  });

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const fetchWallet = async (userId: string) => {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching wallet:', error);
      return null;
    }
    return data;
  };

  const createWallet = async (userId: string) => {
    const { data, error } = await supabase
      .from('wallets')
      .insert({ user_id: userId })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating wallet:', error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (initialSession?.user) {
          const profile = await fetchProfile(initialSession.user.id);
          let wallet = await fetchWallet(initialSession.user.id);

          if (!wallet && profile) {
            wallet = await createWallet(initialSession.user.id);
          }

          setState({
            user: initialSession.user,
            profile,
            wallet,
            session: initialSession,
            loading: false,
            error: null,
          });
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({ ...prev, loading: false, error: 'Failed to initialize authentication' }));
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      (async () => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          let wallet = await fetchWallet(session.user.id);

          if (!wallet && profile) {
            wallet = await createWallet(session.user.id);
          }

          setState({
            user: session.user,
            profile,
            wallet,
            session,
            loading: false,
            error: null,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            wallet: null,
            session: null,
            loading: false,
            error: null,
          });
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (contact: string, password: string, userType: 'worker' | 'client', verificationMethod: 'email' | 'phone') => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const normalizedPhone = contact.replace(/[\s-]/g, '').replace(/^0/, '+254');
      const authRequest = verificationMethod === 'email'
        ? supabase.auth.signUp({
            email: contact,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: { user_type: userType },
            },
          })
        : supabase.auth.signUp({
            phone: normalizedPhone,
            password,
            options: { data: { user_type: userType } },
          });

      const result = await Promise.race([
        authRequest,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The verification service timed out. Please try again.')), 15000)),
      ]);
      const { data, error } = result;

      if (error) {
        const message = verificationMethod === 'phone' && /provider|phone/i.test(error.message)
          ? 'SMS verification is not enabled for this Supabase project. Enable a phone provider in Supabase Auth, then try again.'
          : error.message;
        setState(prev => ({ ...prev, loading: false, error: message }));
        return { error: message, needsVerification: false };
      }

      if (!data.user) {
        const message = 'We could not create your account. Please try again.';
        setState(prev => ({ ...prev, loading: false, error: message }));
        return { error: message, needsVerification: false };
      }

      if (data.user.identities && data.user.identities.length === 0) {
        const message = 'An account with this contact already exists. Please sign in or use another one.';
        setState(prev => ({ ...prev, loading: false, error: message }));
        return { error: message, needsVerification: false };
      }

      setState(prev => ({ ...prev, loading: false }));
      return { error: null, needsVerification: !data.session };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during sign up';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message, needsVerification: false };
    }
  };

  const normalizePhone = (contact: string) => contact.replace(/[\s-]/g, '').replace(/^0/, '+254');

  const sendVerificationCode = async (contact: string, method: 'email' | 'phone') => {
    try {
      const result = method === 'phone'
        ? await supabase.auth.signInWithOtp({ phone: normalizePhone(contact), options: { shouldCreateUser: false } })
        : await supabase.auth.signInWithOtp({ email: contact, options: { shouldCreateUser: false } });
      if (result.error) {
        const message = method === 'phone' && /provider|phone/i.test(result.error.message)
          ? 'SMS verification is not enabled in Supabase Auth. Enable a phone provider to send codes.'
          : result.error.message;
        return { error: message };
      }
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to send verification code.' };
    }
  };

  const resendSignupConfirmation = async (contact: string, method: 'email' | 'phone') => {
    try {
      const result = method === 'phone'
        ? await supabase.auth.resend({ type: 'sms', phone: normalizePhone(contact) })
        : await supabase.auth.resend({
            type: 'signup',
            email: contact,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
      return { error: result.error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to resend the confirmation.' };
    }
  };

  const verifyVerificationCode = async (contact: string, code: string, method: 'email' | 'phone') => {
    try {
      const result = method === 'phone'
        ? await supabase.auth.verifyOtp({ phone: normalizePhone(contact), token: code, type: 'sms' })
        : await supabase.auth.verifyOtp({ email: contact, token: code, type: 'email' });
      return { error: result.error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to verify this code.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error: error.message };
      }

      // If onAuthStateChange hasn't fired yet, update state directly from the response
      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        let wallet = await fetchWallet(data.user.id);
        if (!wallet && profile) {
          wallet = await createWallet(data.user.id);
        }
        setState({
          user: data.user,
          profile,
          wallet,
          session: data.session,
          loading: false,
          error: null,
        });
      }

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred during sign in';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      profile: null,
      wallet: null,
      session: null,
      loading: false,
      error: null,
    });
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.user.id);

      if (error) return { error: error.message };

      await refreshProfile();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState(prev => ({ ...prev, profile }));
  };

  const refreshWallet = async () => {
    if (!state.user) return;
    const wallet = await fetchWallet(state.user.id);
    setState(prev => ({ ...prev, wallet }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        sendVerificationCode,
        verifyVerificationCode,
        resendSignupConfirmation,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
        refreshWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
