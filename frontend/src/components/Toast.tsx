import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastContextType = {
  push: (kind: ToastKind, message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-in rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur bg-panel/90 ${
              t.kind === "success"
                ? "border-success/40 text-success"
                : t.kind === "error"
                ? "border-danger/40 text-danger"
                : "border-accent/40 text-accent"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs mt-0.5">
                {t.kind === "success" ? "✓" : t.kind === "error" ? "✕" : "ℹ"}
              </span>
              <span>{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}