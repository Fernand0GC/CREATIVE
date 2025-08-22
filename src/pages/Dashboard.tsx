import DashboardCards from "@/components/DashboardCards";
import RecentTables from "@/components/RecentTables";
import ReportsChart from "@/components/ReportsChart";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-blue-950 font-bold text-foreground">PANEL DE ACTIVIDAD</h1>
        <p className="text-muted-foreground text-slate-900">
          Bienvenido de vuelta. Aquí está el resumen de tu negocio.
        </p>
      </div>

      <DashboardCards />
      <RecentTables />
      <ReportsChart />
    </div>
  );
};

export default Dashboard;