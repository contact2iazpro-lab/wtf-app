/**
 * Null AuthContext stub for game preview context.
 * Prevents Supabase auth from initializing in the admin-tool preview panel.
 */
export const AuthContext = null
export function AuthProvider({ children }) { return children }
export function useAuth() {
  return {
    user: null,
    profile: null,
    loading: false,
    signIn: () => {},
    signOut: () => {},
    updateProfile: () => {},
  }
}
