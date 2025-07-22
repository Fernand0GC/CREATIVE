import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, AlertCircle, DollarSign } from "lucide-react";

const DashboardCards = () => {
  const cards = [
    {
      title: "Ingresos del día",
      value: "€2,485",
      change: "+12.5%",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Trabajos pendientes",
      value: "12",
      change: "+3 nuevos",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Pagos pendientes",
      value: "€3,240",
      change: "5 facturas",
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Crecimiento mensual",
      value: "+18.2%",
      change: "vs mes anterior",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="shadow-soft border-0 bg-card/80 backdrop-blur-sm hover:shadow-elegant transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardCards;