import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";

export default function Challenge() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [flag, setFlag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [solved, setSolved] = useState(false);
  const { push } = useToast();

  async function load() {
    try {
      const d = await api.doroWot();
      setData(d);
      setSolved(!!d.solve);
    } catch (err) {
      if (err instanceof ApiError) push("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function purchase() {
    setPurchasing(true);
    try {
      const res = await api.purchase();
      push(
        res.points < 0 ? "success" : "info",
        `Purchase returned: ${res.points} points`
      );
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        push("error", err.message);
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function submitFlag(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitFlag(flag.trim());
      push("success", "Flag accepted!");
      setSolved(true);
      await load();
    } catch (err) {
      if (err instanceof ApiError) push("error", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="font-mono text-accent animate-pulse">loading…</div>
    );
  }

  const { user, challenge } = data;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <Link
          to="/dashboard"
          className="text-xs font-mono text-gray-500 hover:text-accent"
        >
          ← dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-3">
          The Doro Wot <span className="text-accent">Challenge</span>
        </h1>
      </div>

      <div className="bg-panel border border-border rounded-xl p-6 space-y-4">
        <p className="text-gray-300 leading-relaxed">
          You have joined <span className="text-accent font-mono">N4yCTF</span>.
          A legendary <span className="text-warning font-semibold">Doro Wot</span>{" "}
          meal is available for{" "}
          <span className="text-accent font-mono font-bold">
            {challenge.cost} points
          </span>
          .
        </p>
        <p className="text-gray-300 leading-relaxed">
          Your account currently receives only{" "}
          <span className="text-success font-mono">100 points per day</span>.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Your task is to obtain the Doro Wot without waiting multiple days.
        </p>

        <div className="border-l-2 border-accent/60 pl-4 py-2 bg-panelAlt rounded-r-md">
          <p className="text-sm text-gray-400 italic">
            "Sometimes, what happens at the same time matters more than what
            happens first."
          </p>
        </div>

        <div className="text-xs text-gray-500 font-mono pt-2 border-t border-border">
          <span className="text-gray-600">hint:</span> inspect the network
          requests your browser makes. The purchase endpoint is{" "}
          <span className="text-accent">POST /api/doro-wot/purchase</span>.
        </div>
      </div>

      <div className="bg-panel border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-mono text-gray-500">
              YOUR BALANCE
            </div>
            <div className="text-2xl font-mono font-bold text-accent">
              {user.points} pts
            </div>
          </div>
          <div className="text-xs font-mono text-gray-500 text-right">
            <div>cost: {challenge.cost}</div>
            <div>purchases: {data.purchases}</div>
          </div>
        </div>

        <button
          onClick={purchase}
          disabled={purchasing}
          className="w-full font-mono font-bold py-3 rounded-md bg-accent text-bg hover:bg-accent/90 transition disabled:opacity-50"
        >
          {purchasing ? "purchasing…" : "attempt purchase"}
        </button>
      </div>

      {!solved && (
        <div className="bg-panel border border-border rounded-xl p-6">
          <h2 className="font-bold mb-3">Flag Submission</h2>
          <p className="text-sm text-gray-400 mb-4">
            Once you have exploited the challenge, submit the flag you obtained.
          </p>
          <form onSubmit={submitFlag} className="flex gap-2">
            <input
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="N4YCTF{...}"
              className="flex-1 bg-panelAlt border border-border rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-accent"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-5 font-mono font-bold rounded-md bg-accent text-bg hover:bg-accent/90 transition disabled:opacity-50"
            >
              {submitting ? "…" : "submit"}
            </button>
          </form>
        </div>
      )}

      {solved && (
        <div className="bg-panel border border-success/40 rounded-xl p-6 animate-pop-in">
          <div className="text-success font-bold text-lg mb-2">
            Challenge Completed!
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Your flag has been verified. The Doro Wot reward is unlocked.
          </p>
          <Link
            to="/reward"
            className="inline-block text-xs font-mono px-4 py-2 rounded-md bg-success text-bg font-bold"
          >
            claim your Doro Wot →
          </Link>
        </div>
      )}
    </div>
  );
}