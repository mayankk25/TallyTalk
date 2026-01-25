import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, AuthState } from '@/types';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Required for web browser auth
WebBrowser.maybeCompleteAuthSession();

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          created_at: session.user.created_at,
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // Get the redirect URL using Linking (no native crypto needed)
      const redirectUrl = Linking.createURL('auth/callback');

      console.log('OAuth Redirect URL:', redirectUrl);

      // Start the OAuth flow with Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      // Store the captured deep link URL
      let capturedDeepLink: string | null = null;

      // Set up the deep link listener BEFORE opening the browser
      const handleUrl = (event: { url: string }) => {
        console.log('Deep link received:', event.url);
        // Check if URL starts with our scheme and contains auth tokens
        if (event.url.startsWith('budgetapp://') && (event.url.includes('access_token') || event.url.includes('code='))) {
          capturedDeepLink = event.url;
        }
      };

      const subscription = Linking.addEventListener('url', handleUrl);

      // Open the browser for authentication
      const browserResult = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log('Browser result type:', browserResult.type);
      console.log('Captured deep link:', capturedDeepLink);

      // Clean up the listener
      subscription.remove();

      // Determine which URL to use
      let resultUrl: string | null = null;

      if (browserResult.type === 'success' && browserResult.url) {
        resultUrl = browserResult.url;
      } else if (capturedDeepLink) {
        // Use the deep link captured during browser session
        resultUrl = capturedDeepLink;
      } else if (browserResult.type === 'dismiss') {
        // Wait a moment in case deep link arrives slightly late
        console.log('Browser dismissed, waiting briefly for deep link...');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (capturedDeepLink) {
          resultUrl = capturedDeepLink;
        }
      }

      if (resultUrl) {
        console.log('Processing OAuth callback URL:', resultUrl);
        const url = new URL(resultUrl);

        // Check for access_token in fragment (hash)
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        console.log('Hash params:', url.hash);
        console.log('Query params:', url.search);
        console.log('Access token found:', !!accessToken);

        if (accessToken) {
          // Set the session with the tokens
          console.log('Setting session with access token...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }
          console.log('Session set successfully');
          return { error: null };
        }

        // Check for code in query params (authorization code flow)
        const code = url.searchParams.get('code');
        console.log('Code found:', !!code);
        if (code) {
          console.log('Exchanging code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Exchange error:', exchangeError);
            throw exchangeError;
          }
          console.log('Code exchange successful');
          return { error: null };
        }

        // Check for error
        const errorParam = hashParams.get('error') || url.searchParams.get('error');
        if (errorParam) {
          const errorDescription = hashParams.get('error_description') || url.searchParams.get('error_description');
          console.error('OAuth error:', errorParam, errorDescription);
          throw new Error(errorDescription || errorParam);
        }

        console.log('No token, code, or error found in callback URL');
      }

      if (browserResult.type === 'cancel') {
        return { error: new Error('Sign in was cancelled') };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };
}
