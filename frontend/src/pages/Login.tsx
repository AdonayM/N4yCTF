import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { push } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await api.login({ identifier, password });
      setUser(user);
      push("success", `Welcome back, ${user.username}`);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) push("error", err.message);
      else push("error", "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accentDim items-center justify-center font-mono font-bold text-bg text-xl mb-4">
            N4
          </div>
          <h1 className="font-mono text-2xl font-bold">N4yCTF</h1>
          <p className="text-gray-500 text-sm mt-1">
            Authenticate to continue
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-panel border border-border rounded-xl p-6 space-y-4 shadow-glow"
        >
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-panelAlt border border-border rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-accent transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-panelAlt border border-border rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-accent transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg font-mono font-bold py-2.5 rounded-md hover:bg-accent/90 transition disabled:opacity-50"
          >
            {loading ? "authenticating…" : "authenticate"}
          </button>

          <p className="text-center text-xs text-gray-500">
            No account?{" "}
            <Link to="/register" className="text-accent hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}