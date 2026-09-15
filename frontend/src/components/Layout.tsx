import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useToast } from "./Toast";

export function Layout({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  async function handleLogout() {
    try {
      await api.logout();
      setUser(null);
      push("info", "Logged out");
      navigate("/login");
    } catch {
      push("error", "Logout failed");
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border bg-panel/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-accent to-accentDim flex items-center justify-center font-mono font-bold text-bg">
              N4
            </div>
            <span className="font-mono font-bold text-lg tracking-tight group-hover:text-accent transition">
              N4yCTF
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-gray-500">Signed in as</span>
                <span className="text-sm font-mono text-accent">
                  {user.username}
                </span>
              </div>
              <div className="font-mono text-sm px-3 py-1.5 rounded-md border border-border bg-panelAlt">
                <span className="text-gray-500">pts</span>{" "}
                <span className="text-accent font-bold">{user.points}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-mono px-3 py-1.5 rounded-md border border-border hover:border-danger/50 hover:text-danger transition"
              >
                logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-border py-4">
        <div className="max-w-6xl mx-auto px-4 text-xs text-gray-600 font-mono flex justify-between">
          <span>N4yCTF — single-challenge platform</span>
          <span>// learn by breaking</span>
        </div>
      </footer>
    </div>
  );
}