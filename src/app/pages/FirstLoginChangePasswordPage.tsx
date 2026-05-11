import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Building2, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getSupabaseClient } from "../lib/supabaseClient";
import { Reveal } from "../components/Reveal";

export function FirstLoginChangePasswordPage() {
  const navigate = useNavigate();
  const { authReady, isAuthenticated, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (!user?.mustChangePassword) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authReady, isAuthenticated, user?.mustChangePassword, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase no está configurado.");
      return;
    }

    setIsLoading(true);
    const { error: updErr } = await client.auth.updateUser({ password });
    if (updErr) {
      setIsLoading(false);
      setError(updErr.message);
      return;
    }

    const { error: rpcErr } = await client.rpc("complete_tokko_initial_password");
    if (rpcErr) {
      setIsLoading(false);
      setError(
        "La contraseña se actualizó pero no se pudo marcar el acceso como listo. Vuelve a intentar o contacta a soporte."
      );
      if (import.meta.env.DEV) {
        console.warn("[Viterra] complete_tokko_initial_password:", rpcErr.message);
      }
      return;
    }

    setIsLoading(false);
    // Recarga completa para que AuthContext vuelva a leer `tokko_users` y no quede `mustChangePassword` obsoleto en memoria.
    window.location.assign("/admin/dashboard");
  };

  if (!authReady || !isAuthenticated || !user?.mustChangePassword) {
    return (
      <div className="viterra-page flex min-h-screen flex-col items-center justify-center bg-white p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="viterra-page flex min-h-screen flex-col bg-white">
      <div className="flex flex-1 items-center justify-center p-6">
        <Reveal className="w-full max-w-md" y={24}>
          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="font-heading mb-2 text-3xl font-semibold tracking-tight text-brand-navy">
              Establece tu contraseña
            </h1>
            <p className="text-sm font-medium text-slate-600">
              Por seguridad, debes elegir una contraseña nueva antes de continuar al panel.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-700"
                  style={{ letterSpacing: "0.05em", fontWeight: 600 }}
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4.5 w-4.5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="block w-full rounded-lg border border-slate-200 py-3 pl-11 pr-11 text-sm font-medium text-brand-navy transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-ring/40"
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center rounded-r-lg pr-3.5 transition-colors hover:bg-slate-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-slate-600" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-700"
                  style={{ letterSpacing: "0.05em", fontWeight: 600 }}
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4.5 w-4.5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="block w-full rounded-lg border border-slate-200 py-3 pl-11 pr-4 text-sm font-medium text-brand-navy transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-ring/40"
                    placeholder="Repite la contraseña"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{
                    fontWeight: 500,
                    backgroundColor: "#fef2f2",
                    borderWidth: "1px",
                    borderColor: "#fecaca",
                    color: "#991b1b",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-all hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando…
                  </>
                ) : (
                  <>
                    Continuar al panel
                    <ArrowRight className="h-4.5 w-4.5" strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
