import DashboardCards from "@/components/DashboardCards";
import RecentTables from "@/components/RecentTables";
import ReportsChart from "@/components/ReportsChart";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
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