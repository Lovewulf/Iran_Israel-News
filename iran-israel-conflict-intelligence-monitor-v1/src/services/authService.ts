import { supabase } from '../lib/supabaseClient';

export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
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
  // Safely subscribe to auth changes
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, session?.user?.email);
    callback(session?.user ?? null);
  });
  // Return the subscription object for cleanup
  return data?.subscription || { unsubscribe: () => {} };
};
