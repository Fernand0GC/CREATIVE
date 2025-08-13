import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { usePayments } from "@/hooks/usePayments";

// Helper: normaliza Firestore Timestamp | string | Date -> Date | null
const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v?.toDate && typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// Helper: compara solo por día
const isSameDay = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

// Helper: chequea si una fecha cae dentro de un mes/año concretos
const inMonth = (d: Date, month: number, year: number) =>
  d.getMonth() === month && d.getFullYear() === year;

const DashboardCards = () => {
  const { orders } = useOrders();
  const { payments } = usePayments();

  const stats = useMemo(() => {
    const today = new Date();

    // Ingresos del día
    const todaysPayments = payments.filter((p) => {
      const d = toDate(p.createdAt);
      return d ? isSameDay(d, today) : false;
    });
    const dailyIncome = todaysPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Trabajos pendientes
    const pendingOrders = orders.filter((o) => o.status === "pendiente").length;

    // Pagos pendientes
    const pendingPayments = orders
      .filter((o) => o.status === "pendiente" && Number(o.balance) > 0)
      .reduce((sum, o) => sum + Number(o.balance || 0), 0);

    // Crecimiento mensual
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const prevMonth = (curMonth + 11) % 12;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;

    const currentMonthPayments = payments
      .filter((p) => {
        const d = toDate(p.createdAt);
        return d ? inMonth(d, curMonth, curYear) : false;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const lastMonthPayments = payments
      .filter((p) => {
        const d = toDate(p.createdAt);
        return d ? inMonth(d, prevMonth, prevYear) : false;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const monthlyGrowth =
      lastMonthPayments > 0
        ? ((currentMonthPayments - lastMonthPayments) / lastMonthPayments) * 100
        : 0;

    return {
      dailyIncome,
      pendingOrders,
      pendingPayments,
      monthlyGrowth,
      pendingCount: orders.filter((o) => Number(o.balance) > 0).length,
    };
  }, [orders, payments]);

  const cards = [
    {
      title: "Ingresos del día",
      value: `Bs. ${stats.dailyIncome.toFixed(2)}`,
      change: "Total de hoy",
      icon: null,
      customText: "Bs",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      title: "Trabajos pendientes",
      value: String(stats.pendingOrders),
      change: "Por completar",
      icon: Clock,
      customText: null,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      title: "Pagos pendientes",
      value: `Bs. ${stats.pendingPayments.toFixed(2)}`,
      change: `${stats.pendingCount} órdenes`,
      icon: AlertCircle,
      customText: null,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
    },
    {
      title: "Crecimiento mensual",
      value: `${stats.monthlyGrowth.toFixed(1)}%`,
      change: "vs mes anterior",
      icon: TrendingUp,
      customText: null,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`shadow-lg border-2 ${card.borderColor} bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600">
              {card.title}
            </CardTitle>
            <div
              className={`p-3 rounded-xl ${card.bgColor} shadow-sm border ${card.borderColor} flex items-center justify-center`}
            >
              {card.customText ? (
                <span className={`font-bold ${card.color}`}>{card.customText}</span>
              ) : (
                <card.icon className={`h-5 w-5 ${card.color}`} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">{card.value}</div>
            <p className="text-sm text-slate-500 font-medium">{card.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardCards;
