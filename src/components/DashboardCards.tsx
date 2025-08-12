import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Clock, AlertCircle, DollarSign } from "lucide-react"
import { useOrders } from "@/hooks/useOrders"
import { usePayments } from "@/hooks/usePayments"

const DashboardCards = () => {
  const { orders } = useOrders()
  const { payments } = usePayments()
  const [stats, setStats] = useState({
    dailyIncome: 0,
    pendingOrders: 0,
    pendingPayments: 0,
    monthlyGrowth: 0,
  })

  useEffect(() => {
    // Calcular ingresos del día
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyPayments = orders.filter(
      (orders) => new Date(orders.createdAt) >= today
    )
    const dailyIncome = dailyPayments.reduce(
      (sum, orders) => sum + orders.deposit,
      0
    )

    // Calcular trabajos pendientes
    const pendingOrders = orders.filter(
      (order) => order.status === "pendiente"
    ).length

    // Calcular pagos pendientes (modificar esta parte)
    const totalPendingAmount = orders
      .filter((order) => order.status === "pendiente" && order.balance > 0)
      .reduce((sum, order) => sum + order.balance, 0)

    // Calcular crecimiento mensual
    const currentMonth = new Date().getMonth()
    const lastMonth = currentMonth - 1

    const currentMonthPayments = payments
      .filter(
        (payment) => new Date(payment.createdAt).getMonth() === currentMonth
      )
      .reduce((sum, payment) => sum + payment.amount, 0)

    const lastMonthPayments = payments
      .filter((payment) => new Date(payment.createdAt).getMonth() === lastMonth)
      .reduce((sum, payment) => sum + payment.amount, 0)

    const monthlyGrowth =
      lastMonthPayments && lastMonthPayments !== 0
        ? ((currentMonthPayments - lastMonthPayments) / lastMonthPayments) * 100
        : 0

    setStats({
      dailyIncome,
      pendingOrders,
      pendingPayments: totalPendingAmount,
      monthlyGrowth,
    })
  }, [orders, payments])

  const cards = [
    {
      title: "Ingresos del día",
      value: `Bs. ${stats.dailyIncome.toFixed(2)}`,
      change: "Total de hoy",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      title: "Trabajos pendientes",
      value: stats.pendingOrders.toString(),
      change: "Por completar",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      title: "Pagos pendientes",
      value: `Bs. ${stats.pendingPayments.toFixed(2)}`,
      change: `${orders.filter((o) => o.balance > 0).length} órdenes`,
      icon: AlertCircle,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
    },
    {
      title: "Crecimiento mensual",
      value: `${stats.monthlyGrowth.toFixed(1)}%`,
      change: "vs mes anterior",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
  ]

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
              className={`p-3 rounded-xl ${card.bgColor} shadow-sm border ${card.borderColor}`}
            >
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {card.value}
            </div>
            <p className="text-sm text-slate-500 font-medium">{card.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default DashboardCards
