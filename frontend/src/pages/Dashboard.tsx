import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";
import { ProgressBar } from "../components/ProgressBar";
import { useAuth } from "../context/AuthContext";

function fmtDuration(ms: number) {
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [tick, setTick] = useState(0);
  const { push } = useToast();
  const { refresh } = useAuth();

  async function load() {
    try {
      const d = await api.dashboard();
      setData(d);
    } catch (err) {
      if (err instanceof ApiError) push("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function claimDaily() {
    setClaiming(true);
    try {
      const res = await api.claimDaily();
      push("success", res.message);
      await load();
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) push("error", err.message);
    } finally {
      setClaiming(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="font-mono text-accent animate-pulse">loading…</div>
    );
  }

  const { user, daily, challenge, doroCost } = data;
  const nextMs = daily.nextAvailableAt
    ? new Date(daily.nextAvailableAt).getTime() - Date.now()
    : 0;
  const canClaim = daily.canClaim;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, <span className="text-accent font-mono">{user.username}</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Complete the challenge to unlock your Doro Wot reward.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Points card */}
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="text-xs font-mono text-gray-500 mb-2">
            CURRENT POINTS
          </div>
          <div className="text-4xl font-mono font-bold text-accent">
            {user.points}
          </div>
          <div className="mt-4">
            <ProgressBar value={user.points} max={doroCost} />
            <div className="flex justify-between text-xs text-gray-500 mt-1.5 font-mono">
              <span>{user.points} pts</span>
              <span>{doroCost} pts needed</span>
            </div>
          </div>
        </div>

        {/* Daily reward card */}
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="text-xs font-mono text-gray-500 mb-2">
            DAILY REWARD
          </div>
          <div className="text-4xl font-mono font-bold text-success">
            +{daily.amount}
          </div>
          <div className="mt-4 text-xs text-gray-400 font-mono">
            {canClaim ? (
              <span className="text-success">Available now</span>
            ) : (
              <span>
                Next in:{" "}
                <span className="text-accent">{fmtDuration(nextMs)}</span>
              </span>
            )}
          </div>
          <button
            onClick={claimDaily}
            disabled={!canClaim || claiming}
            className="mt-4 w-full text-xs font-mono py-2 rounded-md border transition disabled:opacity-40 disabled:cursor-not-allowed border-accent/50 text-accent hover:bg-accent/10"
          >
            {claiming ? "claiming…" : canClaim ? "claim +100" : "claimed"}
          </button>
        </div>

        {/* Challenge card */}
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="text-xs font-mono text-gray-500 mb-2">
            CHALLENGE
          </div>
          <div className="text-lg font-bold">{challenge.title}</div>
          <div className="mt-2 text-sm text-gray-400">
            Cost: <span className="text-accent font-mono">{challenge.cost}</span> points
          </div>
          <div className="mt-2">
            <span
              className={`inline-block text-xs font-mono px-2 py-1 rounded border ${
                challenge.solved
                  ? "border-success/50 text-success"
                  : "border-warning/50 text-warning"
              }`}
            >
              {challenge.solved ? "SOLVED ✓" : "LOCKED"}
            </span>
          </div>
          <Link
            to="/challenge/doro-wot"
            className="mt-4 block text-center text-xs font-mono py-2 rounded-md bg-accent text-bg font-bold hover:bg-accent/90 transition"
          >
            open challenge
          </Link>
        </div>
      </div>

      {challenge.solved && (
        <div className="bg-panel border border-success/40 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-success">
                Challenge Completed
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Your Doro Wot reward is unlocked.
              </div>
            </div>
            <Link
              to="/reward"
              className="text-xs font-mono px-4 py-2 rounded-md bg-success text-bg font-bold"
            >
              view reward →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}