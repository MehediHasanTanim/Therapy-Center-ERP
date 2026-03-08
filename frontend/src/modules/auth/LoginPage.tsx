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
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <Button disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
