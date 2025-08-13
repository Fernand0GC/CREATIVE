// src/components/RecentTables.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useOrders } from "@/hooks/useOrders";
import { usePayments } from "@/hooks/usePayments";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";

// ----------------- Helpers -----------------
const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v?.toDate && typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmtBs = (n: number | string | undefined) => {
  const val = typeof n === "string" ? Number(n) : typeof n === "number" ? n : 0;
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(isFinite(val) ? val : 0);
};

const getStatusColor = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "completado":
    case "completa":
    case "pagado":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "en progreso":
    case "procesando":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    case "pendiente":
    case "impago":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    case "cancelado":
    case "anulado":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  }
};

// Numeración (más reciente = Nº 1)
const withSequence = <T extends { _sort: number }>(rows: T[]) =>
  rows.map((row, idx) => ({ ...row, seq: idx + 1 }));

const tail = (id?: string | null, n = 4) => (id ? id.slice(-n) : "");

// ----------------- Componente -----------------
const RecentTables = () => {
  const { orders = [], loading: loadingOrders } = useOrders();
  const { payments = [], loading: loadingPayments } = usePayments();
  const { clients = [], loading: loadingClients } = useClients();
  const { services = [], loading: loadingServices } = useServices();

  // Diccionarios por id para acceso O(1)
  const clientById = useMemo(() => {
    const m = new Map<string, any>();
    clients.forEach((c: any) => m.set(c.id ?? c.docId, c));
    return m;
  }, [clients]);

  const serviceById = useMemo(() => {
    const m = new Map<string, any>();
    services.forEach((s: any) => m.set(s.id ?? s.docId, s));
    return m;
  }, [services]);

  // Mapa de órdenes por id (útil para pagos -> orderId -> clientId/status)
  const orderById = useMemo(() => {
    const m = new Map<string, any>();
    orders.forEach((o: any) => m.set(o.id, o));
    return m;
  }, [orders]);

  // --- Órdenes: usar clientId/serviceId (strings) y resolver nombres ---
  const recentOrders = useMemo(() => {
    const rows =
      (orders || []).map((o: any) => {
        const created =
          toDate(o?.createdAt) ||
          toDate(o?.startDate) ||
          toDate(o?.fechaInicio) ||
          toDate(o?.fechaFinal) ||
          null;

        const idCli: string | undefined = o?.clientId ?? o?.idCliente;
        const idSrv: string | undefined = o?.serviceId ?? o?.servicioId;

        const cli = idCli ? clientById.get(idCli) : undefined;
        const srv = idSrv ? serviceById.get(idSrv) : undefined;

        const clientName =
          o?.clienteNombre || cli?.nombre || cli?.name || (idCli ? `Cliente #${tail(idCli)}` : "Cliente —");

        const serviceName =
          o?.servicioNombre || srv?.nombre || srv?.name || (idSrv ? `Servicio #${tail(idSrv)}` : "Servicio —");

        const estado = o?.estado || o?.status || "Pendiente";
        const monto =
          typeof o?.total !== "undefined"
            ? o.total
            : typeof o?.monto !== "undefined"
              ? o.monto
              : 0;

        return {
          id: o?.id || o?.docId || "—",
          client: clientName,
          service: serviceName,
          status: estado,
          date: created ? created.toISOString().slice(0, 10) : "",
          amount: fmtBs(monto),
          _sort: created ? created.getTime() : 0,
        };
      }) || [];

    const ordered = rows.sort((a, b) => b._sort - a._sort).slice(0, 8);
    return withSequence(ordered);
  }, [orders, clientById, serviceById]);

  // --- Pagos: orderId -> orden -> clientId & status (de la orden) ---
  const recentPayments = useMemo(() => {
    const rows =
      (payments || []).map((p: any) => {
        const created = toDate(p?.createdAt) || null;

        const ord = p?.orderId ? orderById.get(p.orderId) : undefined;

        const idCli: string | undefined = ord?.clientId ?? ord?.idCliente;
        const cli = idCli ? clientById.get(idCli) : undefined;

        const clientName =
          p?.clienteNombre || cli?.nombre || cli?.name || (idCli ? `Cliente #${tail(idCli)}` : "Cliente —");

        // Estado mostrado = estado de la ORDEN (fallback: estado del pago si no hay orden)
        const statusFromOrder = ord?.estado || ord?.status;
        const status = statusFromOrder || p?.status || p?.estado || "Registrado";

        const method = p?.paymentMethod || p?.method || p?.metodo || "—";
        const amount =
          typeof p?.amount !== "undefined"
            ? p.amount
            : typeof p?.monto !== "undefined"
              ? p.monto
              : 0;

        return {
          id: p?.id || p?.docId || "—",
          client: clientName,
          method,
          status,
          date: created ? created.toISOString().slice(0, 10) : "",
          amount: fmtBs(amount),
          _sort: created ? created.getTime() : 0,
        };
      }) || [];

    const ordered = rows.sort((a, b) => b._sort - a._sort).slice(0, 8);
    return withSequence(ordered);
  }, [payments, orderById, clientById]);

  const loadingCatalogs = loadingClients || loadingServices;

  const showingOrders = recentOrders.length;
  const totalOrders = orders?.length || showingOrders;
  const showingPayments = recentPayments.length;
  const totalPayments = payments?.length || showingPayments;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Órdenes recientes */}
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
                  <TableHead className="font-medium">Nº</TableHead>
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Estado</TableHead>
                  <TableHead className="font-medium">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!loadingOrders && !loadingCatalogs ? recentOrders : []).map((order) => (
                  <TableRow key={`${order.id}-${order.seq}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">{order.seq}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.client}</div>
                        <div className="text-sm text-muted-foreground">{order.service}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{order.amount}</TableCell>
                  </TableRow>
                ))}

                {(loadingOrders || loadingCatalogs) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      Cargando órdenes…
                    </TableCell>
                  </TableRow>
                )}
                {!loadingOrders && !loadingCatalogs && recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No hay órdenes registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {showingOrders} de {totalOrders} órdenes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagos recientes */}
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
                  <TableHead className="font-medium">Nº</TableHead>
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Estado (orden)</TableHead>
                  <TableHead className="font-medium">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loadingPayments ? [] : recentPayments).map((payment) => (
                  <TableRow key={`${payment.id}-${payment.seq}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">{payment.seq}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.client}</div>
                        <div className="text-sm text-muted-foreground">{payment.method}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{payment.amount}</TableCell>
                  </TableRow>
                ))}

                {loadingPayments && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      Cargando pagos…
                    </TableCell>
                  </TableRow>
                )}
                {!loadingPayments && recentPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No hay pagos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {showingPayments} de {totalPayments} pagos
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled>
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
