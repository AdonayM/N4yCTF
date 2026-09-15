import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";

export default function Reward() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const d = await api.doroWot();
        if (!d.solve) {
          push("error", "Reward locked. Solve the challenge first.");
          navigate("/challenge/doro-wot");
          return;
        }
        setData(d);
      } catch (err) {
        if (err instanceof ApiError) push("error", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <div className="font-mono text-accent animate-pulse">loading…</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center animate-pop-in">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold">
          Doro Wot <span className="text-success">Unlocked!</span>
        </h1>
      </div>

      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-amber-900/40 via-red-900/30 to-orange-800/40 flex items-center justify-center relative">
          {/*
            Doro Wot image placeholder.
            Replace the <div> below with an <img src="..." /> of your
            favourite royalty-free Doro Wot photo when available.
          */}
          <div className="text-center">
            <div className="text-7xl mb-3">🍲</div>
            <div className="font-mono text-sm text-amber-200/80">
              [ doro wot image placeholder ]
            </div>
            <div className="font-mono text-xs text-amber-200/50 mt-1">
              replace with royalty-free asset
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <div className="text-xl font-bold text-success">
              Congratulations!
            </div>
            <p className="text-gray-300 mt-2">
              You successfully exploited the race condition.
            </p>
            <p className="text-gray-400 text-sm mt-1">
              You earned the Doro Wot reward.
            </p>
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs font-mono text-gray-500">CHALLENGE</div>
              <div className="font-mono">The Doro Wot Challenge</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-gray-500">STATUS</div>
              <div className="font-mono text-success font-bold">
                SOLVED ✓
              </div>
            </div>
          </div>

          {data.solve?.solvedAt && (
            <div className="text-xs font-mono text-gray-500 text-center pt-2 border-t border-border">
              solved at {new Date(data.solve.solvedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/dashboard"
          className="text-xs font-mono text-gray-500 hover:text-accent"
        >
          ← back to dashboard
        </Link>
      </div>
    </div>
  );
}