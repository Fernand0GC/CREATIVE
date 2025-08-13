// src/components/ReportsChart.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePayments } from "@/hooks/usePayments";

// --- Helpers ---
const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v?.toDate && typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmtBs = (n: number) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(n);

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (d: Date) => {
  const s = new Intl.DateTimeFormat("es-BO", { month: "short" }).format(d);
  // quitar punto final y capitalizar
  const clean = s.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1, 3); // Ene, Feb, Mar...
};

const lastNMonths = (n: number) => {
  const list: { key: string; label: string; date: Date }[] = [];
  const base = new Date();
  base.setDate(1); // normalizar a día 1
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    list.push({ key: monthKey(d), label: monthLabel(d), date: d });
  }
  return list;
};

const ReportsChart = () => {
  const { payments = [], loading } = usePayments();

  // Construir serie mensual (últimos 6 meses)
  const data = useMemo(() => {
    const months = lastNMonths(6);
    const acc = new Map<string, { ingresos: number; gastos: number }>();
    months.forEach((m) => acc.set(m.key, { ingresos: 0, gastos: 0 }));

    (payments || []).forEach((p: any) => {
      const d = toDate(p?.createdAt);
      if (!d) return;
      const key = monthKey(d);
      if (!acc.has(key)) return; // fuera del rango de 6 meses
      const amount =
        typeof p?.amount === "number"
          ? p.amount
          : typeof p?.monto === "number"
            ? p.monto
            : Number(p?.amount || p?.monto || 0);

      const bucket = acc.get(key)!;
      // Ingresos: todos los pagos suman
      bucket.ingresos += isFinite(amount) ? amount : 0;

      // Gastos: si no tienes “gastos”, déjalo en 0.
      // Si luego creas un hook useExpenses o marcas ciertos pagos como egreso,
      // aquí puedes restarlos o sumarlos a bucket.gastos.
    });

    return months.map((m) => ({
      name: m.label,
      ingresos: acc.get(m.key)?.ingresos ?? 0,
      gastos: acc.get(m.key)?.gastos ?? 0,
    }));
  }, [payments]);

  return (
    <Card className="mt-6 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Resumen financiero
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ingresos (pagos) por mes — últimos 6 meses
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(v) =>
                  new Intl.NumberFormat("es-BO", {
                    maximumFractionDigits: 0,
                  }).format(Number(v))
                }
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  fmtBs(Number(value)),
                  name,
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar
                dataKey="ingresos"
                fill="hsl(var(--primary))"
                name="Ingresos"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="gastos"
                fill="hsl(var(--muted))"
                name="Gastos"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {loading && (
          <p className="mt-2 text-xs text-muted-foreground">Cargando datos…</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportsChart;
