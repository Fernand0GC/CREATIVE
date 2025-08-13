import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePayments } from "@/hooks/usePayments";
import { useOrders } from "@/hooks/useOrders";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";

import { Payment } from "@/types/payment";

export default function PaymentsPage() {
  const { payments, registerPayment, getPendingPayments } = usePayments();
  const { orders, getOrders } = useOrders();
  const { clients } = useClients();
  const { services } = useServices();

  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: "efectivo" as Payment["paymentMethod"],
    notes: "",
  });

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await getOrders();
      await getPendingPayments(); // mantiene consistencia con la vista
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resumen usando SOLO la fuente de verdad: orders (deposit/balance)
  const paymentSummaries = useMemo(() => {
    return orders
      .filter((order) => order.status === "pendiente" && Number(order.balance) > 0)
      .map((order) => {
        const client = clients.find((c) => c.id === order.clientId);
        const service = services.find((s) => s.id === order.serviceId);

        return {
          orderId: order.id,
          clientName: client?.name || "Cliente no encontrado",
          serviceName: service?.name || "Servicio no encontrado",
          total: Number(order.total) || 0,
          paid: Number(order.deposit) || 0,
          remaining: Number(order.balance) || 0,
        };
      });
  }, [orders, clients, services]);

  const handleRegisterPayment = async () => {
    if (!selectedOrderId) return;

    // Validación simple
    if (!(newPayment.amount > 0)) return;

    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) return;

    // Evita pagar más que el saldo
    const remaining = Math.max(0, Number(order.total) - Number(order.deposit));
    const amount = Math.min(Number(newPayment.amount), remaining);

    try {
      // Registrar el pago (la transacción actualiza deposit/balance/status)
      await registerPayment(
        selectedOrderId,
        amount,
        newPayment.method,
        newPayment.notes
      );

      // Refrescar datos de órdenes (payments ya se refresca dentro del hook)
      await getOrders();
      await getPendingPayments();

      // Limpiar el formulario
      setIsDialogOpen(false);
      setNewPayment({ amount: 0, method: "efectivo", notes: "" });
    } catch (error) {
      console.error("Error al registrar el pago:", error);
      // Aquí podrías disparar un toast/alert
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pagos Pendientes</h1>
        <p className="text-muted-foreground">
          Gestiona los pagos pendientes y registra nuevos pagos.
        </p>
      </div>

      {loading ? (
        <div className="text-center">Cargando pagos...</div>
      ) : (
        <div className="rounded-md border bg-card/80 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Pendiente</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentSummaries.length > 0 ? (
                paymentSummaries.map((summary) => (
                  <TableRow key={summary.orderId}>
                    <TableCell>{summary.clientName}</TableCell>
                    <TableCell>{summary.serviceName}</TableCell>
                    <TableCell>Bs. {summary.total.toFixed(2)}</TableCell>
                    <TableCell>Bs. {summary.paid.toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-red-500">
                      Bs. {summary.remaining.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedOrderId(summary.orderId);
                          setIsDialogOpen(true);
                        }}
                      >
                        Registrar pago
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No hay pagos pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRegisterPayment();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Monto a pagar</Label>
              <Input
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) =>
                  setNewPayment({
                    ...newPayment,
                    amount: parseFloat(e.target.value || "0"),
                  })
                }
                required
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={newPayment.method}
                onValueChange={(value: Payment["paymentMethod"]) =>
                  setNewPayment({ ...newPayment, method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="qr">QR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                value={newPayment.notes}
                onChange={(e) =>
                  setNewPayment({ ...newPayment, notes: e.target.value })
                }
                placeholder="Agregar notas o referencia..."
              />
            </div>

            <Button type="submit" className="w-full">
              Confirmar pago
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
