import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Sansons1$");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Signed in");
      navigate("/dashboard");
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <Card>
        <div className="login-card">
          <h2>Therapy Center ERP</h2>
          <p>Sign in with your account</p>
          <form onSubmit={onSubmit} className="grid">
            <label>
              Email
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <div className="input-with-icon">
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn icon-only input-icon"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3.5 4.5l16 16M9.5 9.7a3 3 0 004.3 4.3M6 12c1.7-2.7 4.7-4.5 6-4.5 1.4 0 4.3 1.8 6 4.5-0.7 1-1.6 2-2.7 2.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5zM12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </label>
            <Button disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
