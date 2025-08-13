import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Chrome } from "lucide-react";
import clsx from "clsx";

const LoginScreen = () => {
  const { signIn, loading } = useAuth();

  // "azul" | "plomo"
  const THEME: "azul" | "plomo" = "azul";

  const bgClass =
    THEME === "azul"
      ? "from-blue-950 via-slate-950 to-blue-900"
      : "from-slate-950 via-neutral-900 to-slate-800";

  return (
    <div
      className={clsx(
        "relative overflow-hidden",
        "bg-gradient-to-br", bgClass,
        // ✅ centra en X y Y y ocupa alto de la ventana (incluye iOS toolbars)
        "grid place-items-center min-h-[100svh] p-4"
      )}
    >
      {/* blobs decorativos */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl opacity-30 bg-blue-700/40" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-20 bg-indigo-600/40" />

      {/* contenido centrado */}
      <div className="w-full max-w-md">
        <Card className="border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl text-white">
          <CardHeader className="text-center space-y-4">
            <img
              src="/logo.png"
              alt="Creative App Logo"
              className="mx-auto h-28 w-28 rounded-full mb-2 shadow-lg shadow-black/30"
            />
            <div>
              <CardTitle className="text-3xl font-extrabold tracking-tight">
                CREATIVE APP
              </CardTitle>
              <CardDescription className="text-white/70 mt-2">
                Gestiona tu negocio
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-white/70 mb-6">
                Inicia sesión con tu cuenta de Google para acceder al dashboard
              </p>
              <Button
                onClick={signIn}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-white/20 shadow-md transition-smooth"
                size="lg"
                aria-busy={loading}
              >
                <Chrome className="mr-3 h-5 w-5" />
                {loading ? "Cargando..." : "Continuar con Google"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;
