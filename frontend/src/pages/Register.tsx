import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";

export default function Register() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await api.register(form);
      push("success", "Registration successful. Please log in.");
      navigate("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          setErrors(err.details as Record<string, string[]>);
        }
        push("error", err.message);
      } else {
        push("error", "Registration failed");
      }
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
            Create an account to begin
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-panel border border-border rounded-xl p-6 space-y-4 shadow-glow"
        >
          {[
            { key: "username", label: "Username", type: "text" },
            { key: "email", label: "Email", type: "email" },
            { key: "password", label: "Password", type: "password" },
            {
              key: "confirmPassword",
              label: "Confirm Password",
              type: "password",
            },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">
                {f.label}
              </label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => update(f.key as any, e.target.value)}
                className="w-full bg-panelAlt border border-border rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-accent transition"
                required
              />
              {errors[f.key] && (
                <p className="text-danger text-xs mt-1">{errors[f.key][0]}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-bg font-mono font-bold py-2.5 rounded-md hover:bg-accent/90 transition disabled:opacity-50"
          >
            {loading ? "creating…" : "create account"}
          </button>

          <p className="text-center text-xs text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}