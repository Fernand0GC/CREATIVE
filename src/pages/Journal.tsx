// src/pages/Journal.tsx
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Trash2 } from "lucide-react";

import { useJournal } from "@/hooks/useJournal";
import { usePayments } from "@/hooks/usePayments";
import { useOrders } from "@/hooks/useOrders";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";

import { db } from "@/firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";

const fmtBs = (n: number) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB", minimumFractionDigits: 2 }).format(Number(n || 0));

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// >>> Helpers de fecha (LOCAL, no UTC)
const toLocalInputValue = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseLocalDateFromInput = (s: string) => new Date(`${s}T00:00:00`);

const fmtDateTime = (v: any) => {
  const d = v?.toDate?.() ?? new Date(v);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("es-BO")} ${d.toLocaleTimeString("es-BO")}`;
};

export default function JournalPage() {
  const { entries, loading, addEntry, deleteEntry, _toDate } = useJournal();
  const { payments = [] } = usePayments();
  const { orders = [] } = useOrders();
  const { services = [] } = useServices();
  const { clients = [] } = useClients();

  // Día seleccionado (usar valor local, no UTC)
  const [selectedDate, setSelectedDate] = useState<string>(toLocalInputValue(new Date()));
  const selected = parseLocalDateFromInput(selectedDate); // <-- fecha LOCAL

  // ===== Botones/modales: Registrar Ingreso / Egreso =====
  const [openIngreso, setOpenIngreso] = useState(false);
  const [openEgreso, setOpenEgreso] = useState(false);
  const [formIngreso, setFormIngreso] = useState({ amount: "", concept: "" });
  const [formEgreso, setFormEgreso] = useState({ amount: "", concept: "" });

  // ===== Modal VER =====
  type ViewRecord =
    | {
      kind: "ingreso";
      source: "payment" | "manual";
      concept: string;
      amount: number;
      date?: any;
      createdAt?: any;
      orderName?: string;
      method?: string;
      notes?: string;
      clientName?: string;
    }
    | {
      kind: "egreso";
      concept: string;
      amount: number;
      date?: any;
      createdAt?: any;
    };

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<ViewRecord | null>(null);

  const handleOpenView = (r: ViewRecord) => {
    setViewRecord(r);
    setViewOpen(true);
  };

  const handleSaveIngreso = async () => {
    if (!(Number(formIngreso.amount) > 0)) return;
    await addEntry({
      type: "ingreso",
      amount: Number(formIngreso.amount),
      concept: formIngreso.concept || "Ingreso",
      date: selected, // fecha LOCAL
      notes: "",
    });
    setFormIngreso({ amount: "", concept: "" });
    setOpenIngreso(false);
  };

  const handleSaveEgreso = async () => {
    if (!(Number(formEgreso.amount) > 0)) return;
    await addEntry({
      type: "egreso",
      amount: Number(formEgreso.amount),
      concept: formEgreso.concept || "Egreso",
      date: selected, // fecha LOCAL
      notes: "",
    });
    setFormEgreso({ amount: "", concept: "" });
    setOpenEgreso(false);
  };

  // ===== Resolución de nombres =====
  const servicesById = useMemo(() => {
    const m = new Map<string, string>();
    (services || []).forEach((s: any) => m.set(s.id, s.name));
    return m;
  }, [services]);

  const ordersById = useMemo(() => {
    const m = new Map<string, any>();
    (orders || []).forEach((o: any) => m.set(o.id, o));
    return m;
  }, [orders]);

  const clientsById = useMemo(() => {
    const m = new Map<string, any>();
    (clients || []).forEach((c: any) => m.set(c.id, c));
    return m;
  }, [clients]);

  const orderName = (order: any): string => {
    if (!order) return "Orden";
    const sName = servicesById.get(order.serviceId) || "Servicio";
    const details = order.details ? ` - ${order.details}` : "";
    return `${sName}${details}`.trim();
  };

  const clientNameForOrder = (order: any): string => {
    if (!order) return "";
    const c = clientsById.get(order.clientId);
    return c?.name || "";
  };

  // ===== Determinar el PRIMER pago por orden (para "Abono inicial") =====
  const firstPaymentIdByOrder: Record<string, string> = useMemo(() => {
    const idByOrder: Record<string, string> = {};
    const timeByOrder: Record<string, number> = {};
    (payments || []).forEach((p: any) => {
      const ord = p?.orderId as string;
      if (!ord) return;
      const t = _toDate(p?.createdAt) || _toDate(p?.date);
      const ms = t ? t.getTime() : 0;
      if (idByOrder[ord] === undefined || ms < (timeByOrder[ord] ?? Number.POSITIVE_INFINITY)) {
        idByOrder[ord] = p.id as string;
        timeByOrder[ord] = ms;
      }
    });
    return idByOrder;
  }, [payments, _toDate]);

  // ===== Ingresos =====
  type IncomeRow = {
    source: "payment" | "manual";
    paymentId?: string;
    journalId?: string | null;
    orderId?: string;
    orderName?: string;
    clientName?: string; // 👈 nueva propiedad visible en tabla
    concept: string;     // “Abono inicial” o “Saldo” en pagos; manual = libre
    amount: number;
    date: Date;
    createdAt?: Date;
    method?: string;
    notes?: string;
    _sortMs: number;
  };

  const incomesFromPayments: IncomeRow[] = useMemo(() => {
    return (payments || [])
      .filter((p: any) => {
        const d = _toDate(p?.date || p?.createdAt);
        return d ? sameDay(d, selected) : false; // selected es LOCAL
      })
      .map((p: any) => {
        const ord = p.orderId ? ordersById.get(p.orderId) : null;
        const created = _toDate(p?.createdAt);
        const dated = _toDate(p?.date || p?.createdAt) || selected;
        const sortMs = created?.getTime?.() ?? dated.getTime?.() ?? 0;

        const clientName = ord ? clientNameForOrder(ord) : "";
        const isFirst = p.orderId && firstPaymentIdByOrder[p.orderId] === p.id;
        const concept = isFirst ? "Abono inicial" : "Saldo";

        return {
          source: "payment" as const,
          paymentId: p.id as string,
          orderId: p.orderId as string,
          orderName: ord ? orderName(ord) : `Orden ${p.orderId ?? ""}`,
          clientName,
          concept,
          amount: Number(p.amount ?? 0),
          date: dated,
          createdAt: created || dated,
          method: p.paymentMethod,
          notes: p.notes,
          _sortMs: sortMs,
        };
      });
  }, [payments, selected, _toDate, ordersById, servicesById, clientsById, firstPaymentIdByOrder]);

  const manualIngresos: IncomeRow[] = useMemo(() => {
    return (entries || [])
      .filter((e) => e.type === "ingreso")
      .filter((e) => {
        const d = _toDate(e.date);
        return d ? sameDay(d, selected) : false;
      })
      .map((e) => {
        const created = _toDate((e as any).createdAt);
        const dated = _toDate(e.date) || selected;
        const sortMs = created?.getTime?.() ?? dated.getTime?.() ?? 0;
        return {
          source: "manual" as const,
          journalId: e.id || null,
          clientName: "", // ingresos manuales no tienen cliente
          concept: e.concept,
          amount: Number(e.amount || 0),
          date: dated,
          createdAt: created || dated,
          _sortMs: sortMs,
        };
      });
  }, [entries, selected, _toDate]);

  // Fusión + orden por creación desc
  const incomesSorted = useMemo(() => {
    const merged = [...incomesFromPayments, ...manualIngresos];
    merged.sort((a, b) => b._sortMs - a._sortMs);
    return merged;
  }, [incomesFromPayments, manualIngresos]);

  // ===== Egresos (solo manuales) =====
  type EgresoRow = {
    journalId: string | null;
    concept: string;
    amount: number;
    date: Date;
    createdAt?: Date;
    _sortMs: number;
  };

  const egresosManual: EgresoRow[] = useMemo(() => {
    const list = (entries || [])
      .filter((e) => e.type === "egreso")
      .filter((e) => {
        const d = _toDate(e.date);
        return d ? sameDay(d, selected) : false;
      })
      .map((e) => {
        const created = _toDate((e as any).createdAt);
        const dated = _toDate(e.date) || selected;
        const sortMs = created?.getTime?.() ?? dated.getTime?.() ?? 0;
        return {
          journalId: e.id || null,
          concept: e.concept,
          amount: Number(e.amount || 0),
          date: dated,
          createdAt: created || dated,
          _sortMs: sortMs,
        };
      });

    list.sort((a, b) => b._sortMs - a._sortMs);
    return list;
  }, [entries, selected, _toDate]);

  // Totales del día
  const totalIngresos = useMemo(
    () => incomesSorted.reduce((acc, i) => acc + Number(i.amount || 0), 0),
    [incomesSorted]
  );
  const totalEgresos = useMemo(
    () => egresosManual.reduce((acc, i) => acc + Number(i.amount || 0), 0),
    [egresosManual]
  );

  // ===== Eliminar manual =====
  const confirmAndDelete = async (id?: string | null) => {
    if (!id) return;
    if (!window.confirm("¿Eliminar este registro manual?")) return;
    await deleteEntry(id);
  };

  // ===== Finalizar día → guarda en "journal_days"
  const handleFinalizarDia = async () => {
    const closuresCol = collection(db, "journal_days");
    // truncar a 00:00 LOCAL
    const day = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
    await addDoc(closuresCol, {
      date: Timestamp.fromDate(day),
      ingresos: [
        ...incomesFromPayments.map((i) => ({
          source: "payment" as const,
          amount: i.amount,
          concept: i.concept,     // “Abono inicial” o “Saldo”
          orderId: i.orderId,
          orderName: i.orderName,
          paymentId: i.paymentId,
          clientName: i.clientName || "",
        })),
        ...manualIngresos.map((i) => ({
          source: "manual" as const,
          amount: i.amount,
          concept: i.concept,
          journalId: i.journalId || null,
          clientName: i.clientName || "",
        })),
      ],
      egresos: egresosManual.map((e) => ({
        amount: e.amount,
        concept: e.concept,
        journalId: e.journalId || null,
      })),
      totals: {
        ingresos: Number(totalIngresos || 0),
        egresos: Number(totalEgresos || 0),
        neto: Number((totalIngresos - totalEgresos) || 0),
      },
      createdAt: serverTimestamp(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Barra superior: fecha + acciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3 items-end">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenIngreso(true)}>Registrar ingreso</Button>
          <Button variant="destructive" onClick={() => setOpenEgreso(true)}>
            Registrar egreso
          </Button>
          <Button variant="outline" onClick={handleFinalizarDia}>
            Finalizar día
          </Button>
        </div>
      </div>

      {/* Totales del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Ingresos (día)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700">{fmtBs(totalIngresos)}</CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Egresos (día)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-rose-700">{fmtBs(totalEgresos)}</CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm">Neto</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{fmtBs(totalIngresos - totalEgresos)}</CardContent>
        </Card>
      </div>

      {/* TABLA: Ingresos (pagos + manuales, ordenados por creación) */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ingresos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pagos del día + ingresos manuales (más recientes arriba).
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-background/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>{/* 👈 nueva columna */}
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Cargando…
                    </TableCell>
                  </TableRow>
                )}

                {incomesSorted.map((i) => {
                  const canDelete = i.source === "manual" && !!i.journalId;
                  return (
                    <TableRow key={`${i.source}-${i.paymentId ?? i.journalId ?? Math.random()}`}>
                      <TableCell>{i.source === "payment" ? "Pago" : "Manual"}</TableCell>
                      <TableCell>{i.source === "payment" ? i.orderName || "Orden" : "—"}</TableCell>
                      <TableCell>{i.clientName || "—"}</TableCell> {/* cliente */}
                      <TableCell className="max-w-[420px] truncate">{i.concept}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtBs(i.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver"
                            onClick={() =>
                              handleOpenView({
                                kind: "ingreso",
                                source: i.source,
                                concept: i.concept,
                                amount: i.amount,
                                date: i.date,
                                createdAt: i.createdAt,
                                orderName: i.orderName,
                                method: i.method,
                                notes: i.notes,
                                clientName: i.clientName,
                              })
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title={canDelete ? "Eliminar" : "Eliminar (solo desde Pagos)"}
                            disabled={!canDelete}
                            onClick={() => confirmAndDelete(i.journalId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && incomesSorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Sin ingresos para la fecha.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* TABLA: Egresos (manuales), ordenados por creación) */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Egresos</CardTitle>
          <p className="text-sm text-muted-foreground">Solo egresos manuales del diario (más recientes arriba).</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-background/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6">
                      Cargando…
                    </TableCell>
                  </TableRow>
                )}

                {egresosManual.map((e) => (
                  <TableRow key={`man-eg-${e.journalId ?? Math.random()}`}>
                    <TableCell className="max-w-[520px] truncate">{e.concept}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBs(e.amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver"
                          onClick={() =>
                            handleOpenView({
                              kind: "egreso",
                              concept: e.concept,
                              amount: e.amount,
                              date: e.date,
                              createdAt: e.createdAt,
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          onClick={() => confirmAndDelete(e.journalId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && egresosManual.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6">
                      Sin egresos para la fecha.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Ingreso manual */}
      <Dialog open={openIngreso} onOpenChange={setOpenIngreso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar ingreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                inputMode="decimal"
                value={formIngreso.amount}
                onChange={(e) => setFormIngreso((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                value={formIngreso.concept}
                onChange={(e) => setFormIngreso((f) => ({ ...f, concept: e.target.value }))}
                placeholder="Ej: Ingreso por servicio"
              />
            </div>
            <Button onClick={handleSaveIngreso} className="w-full">
              Guardar ingreso
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Egreso manual */}
      <Dialog open={openEgreso} onOpenChange={setOpenEgreso}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar egreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                inputMode="decimal"
                value={formEgreso.amount}
                onChange={(e) => setFormEgreso((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                value={formEgreso.concept}
                onChange={(e) => setFormEgreso((f) => ({ ...f, concept: e.target.value }))}
                placeholder="Ej: Compra de insumos"
              />
            </div>
            <Button variant="destructive" onClick={handleSaveEgreso} className="w-full">
              Guardar egreso
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: VER registro */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-2 text-sm">
              <p>
                <b>Tipo:</b>{" "}
                {viewRecord.kind === "ingreso"
                  ? viewRecord.source === "payment"
                    ? "Ingreso por pago"
                    : "Ingreso manual"
                  : "Egreso manual"}
              </p>
              {viewRecord.kind === "ingreso" && viewRecord.source === "payment" && (
                <>
                  <p>
                    <b>Orden:</b> {viewRecord.orderName || "—"}
                  </p>
                  <p>
                    <b>Cliente:</b> {viewRecord.clientName || "—"}
                  </p>
                  <p>
                    <b>Método:</b> {viewRecord.method || "—"}
                  </p>
                  <p>
                    <b>Nota:</b> {viewRecord.notes || "—"}
                  </p>
                </>
              )}
              <p>
                <b>Concepto:</b> {viewRecord.concept}
              </p>
              <p>
                <b>Monto:</b> {fmtBs(viewRecord.amount)}
              </p>
              <p>
                <b>Fecha (día):</b> {fmtDateTime(viewRecord.date)}
              </p>
              <p>
                <b>Creado:</b> {fmtDateTime(viewRecord.createdAt)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
