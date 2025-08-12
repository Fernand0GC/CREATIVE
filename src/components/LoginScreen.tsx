import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Chrome } from "lucide-react";

const LoginScreen = () => {
  const { signIn, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-elegant border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">

            <img
              src="/logo.png"
              alt="Portal Sync Logo"
              className="mx-auto h-16 w-16 rounded-full mb-4"
            />

            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                CREATIVE APP
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Gestiona tu negocio
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Inicia sesión con tu cuenta de Google para acceder al dashboard
              </p>
              <Button
                onClick={signIn}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-border shadow-sm transition-smooth"
                size="lg"
              >
                <Chrome className="mr-3 h-5 w-5 " />
                {loading ? 'Cargando...' : 'Continuar con Google'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;