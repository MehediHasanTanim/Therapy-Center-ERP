import { useAuth } from "../modules/auth/AuthContext";

export function useRole() {
  const { user } = useAuth();
  return user?.role;
}
