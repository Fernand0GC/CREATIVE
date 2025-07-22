import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, Edit } from "lucide-react";

const RecentTables = () => {
  // Mock data for recent orders
  const recentOrders = [
    {
      id: "ORD-001",
      client: "Juan Pérez",
      service: "Reparación de motor",
      status: "En progreso",
      date: "2024-01-20",
      amount: "€350",
    },
    {
      id: "ORD-002",
      client: "María García",
      service: "Cambio de frenos",
      status: "Completado",
      date: "2024-01-19",
      amount: "€180",
    },
    {
      id: "ORD-003",
      client: "Carlos López",
      service: "Mantenimiento general",
      status: "Pendiente",
      date: "2024-01-18",
      amount: "€120",
    },
  ];

  // Mock data for recent payments
  const recentPayments = [
    {
      id: "PAY-001",
      client: "Ana Rodríguez",
      method: "Tarjeta",
      status: "Completado",
      date: "2024-01-20",
      amount: "€275",
    },
    {
      id: "PAY-002",
      client: "Pedro Martín",
      method: "Efectivo",
      status: "Pendiente",
      date: "2024-01-19",
      amount: "€150",
    },
    {
      id: "PAY-003",
      client: "Laura Sánchez",
      method: "Transferencia",
      status: "Completado",
      date: "2024-01-18",
      amount: "€420",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completado":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "en progreso":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "pendiente":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Recent Orders Table */}
      <Card className="shadow-soft border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Órdenes recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-background/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted">
                  <TableHead className="font-medium">ID</TableHead>
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Estado</TableHead>
                  <TableHead className="font-medium">Monto</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">
                      {order.id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.client}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.service}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{order.amount}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando 3 de 15 órdenes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments Table */}
      <Card className="shadow-soft border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Pagos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-background/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted">
                  <TableHead className="font-medium">ID</TableHead>
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Estado</TableHead>
                  <TableHead className="font-medium">Monto</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">
                      {payment.id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.client}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.method}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{payment.amount}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando 3 de 8 pagos
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentTables;