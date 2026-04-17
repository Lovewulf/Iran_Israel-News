import { supabase } from '../lib/supabaseClient';

// Validate Supabase client is properly initialized
if (!supabase) {
  console.error('Supabase client not initialized. Check your environment variables.');
}

export const signInWithGoogle = async () => {
  try {
    // Get the current origin for redirect (works in both dev and production)
    const redirectUrl = window.location.origin;
    
    console.log('Signing in with Google, redirect to:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      console.error('Supabase OAuth error:', error);
      throw error;
    }
    
    console.log('OAuth initiated successfully');
    return data;
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('User signed out successfully');
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Get current user failed:', error);
    return null;
  }
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    console.log('Auth state changed:', _event, session?.user?.email);
    callback(session?.user ?? null);
  });
  return data;
};
