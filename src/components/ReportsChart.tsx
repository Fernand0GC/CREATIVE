import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ReportsChart = () => {
  // Mock data for the chart
  const data = [
    { name: 'Ene', ingresos: 4000, gastos: 2400 },
    { name: 'Feb', ingresos: 3000, gastos: 1398 },
    { name: 'Mar', ingresos: 2000, gastos: 9800 },
    { name: 'Abr', ingresos: 2780, gastos: 3908 },
    { name: 'May', ingresos: 1890, gastos: 4800 },
    { name: 'Jun', ingresos: 2390, gastos: 3800 },
  ];

  return (
    <Card className="mt-6 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Resumen financiero
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparativa de ingresos vs gastos por mes
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px -4px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
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
      </CardContent>
    </Card>
  );
};

export default ReportsChart;