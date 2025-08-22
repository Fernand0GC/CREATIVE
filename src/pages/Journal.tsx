// src/pages/Journal.tsx
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useJournal } from "@/hooks/useJournal";
import { usePayments } from "@/hooks/usePayments";
import { useOrders } from "@/hooks/useOrders";
import { useServices } from "@/hooks/useServices";

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

export default function JournalPage() {
  const { entries, loading, addEntry, _toDate } = useJournal();
  const { payments = [] } = usePayments();
  const { orders = [] } = useOrders();
  const { services = [] } = useServices();

  // Día seleccionado (usar valor local, no UTC)
  const [selectedDate, setSelectedDate] = useState<string>(toLocalInputValue(new Date()));
  const selected = parseLocalDateFromInput(selectedDate); // <-- fecha LOCAL

  // ===== Botones/modales: Registrar Ingreso / Egreso =====
  const [openIngreso, setOpenIngreso] = useState(false);
  const [openEgreso, setOpenEgreso] = useState(false);
  const [formIngreso, setFormIngreso] = useState({ amount: "", concept: "" });
  const [formEgreso, setFormEgreso] = useState({ amount: "", concept: "" });

  const handleSaveIngreso = async () => {
    if (!(Number(formIngreso.amount) > 0)) return;
    await addEntry({
      type: "ingreso",
      amount: Number(formIngreso.amount),
      concept: formIngreso.concept || "Ingreso",
      date: selected,               // <-- guardar fecha LOCAL
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
      date: selected,               // <-- guardar fecha LOCAL
      notes: "",
    });
    setFormEgreso({ amount: "", concept: "" });
    setOpenEgreso(false);
  };

  // ===== Resolución de nombres de orden (service.name + details) =====
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

  const orderName = (order: any): string => {
    if (!order) return "Orden";
    const sName = servicesById.get(order.serviceId) || "Servicio";
    const details = order.details ? ` - ${order.details}` : "";
    return `${sName}${details}`.trim();
  };

  // ===== Ingresos =====
  // Pagos del día -> usar payment.date (fallback a createdAt) y comparar con fecha LOCAL seleccionada
  const incomesFromPayments = useMemo(() => {
    return (payments || [])
      .filter((p: any) => {
        const d = _toDate(p?.date || p?.createdAt);
        return d ? sameDay(d, selected) : false;   // <-- selected es LOCAL
      })
      .map((p: any) => {
        const ord = p.orderId ? ordersById.get(p.orderId) : null;
        return {
          source: "payment" as const,
          paymentId: p.id as string,
          orderId: p.orderId as string,
          orderName: ord ? orderName(ord) : `Orden ${p.orderId ?? ""}`,
          concept: p.notes || `Pago ${p.paymentMethod || ""}`,
          amount: Number(p.amount ?? 0),
          date: _toDate(p?.date || p?.createdAt) || selected,
        };
      });
  }, [payments, selected, _toDate, ordersById, servicesById]);

  // Ingresos manuales del día (journal)
  const manualIngresos = useMemo(() => {
    return (entries || [])
      .filter((e) => e.type === "ingreso")
      .filter((e) => {
        const d = _toDate(e.date);
        return d ? sameDay(d, selected) : false;
      })
      .map((e) => ({
        source: "manual" as const,
        journalId: e.id || null,
        concept: e.concept,
        amount: Number(e.amount || 0),
        date: _toDate(e.date) || selected,
      }));
  }, [entries, selected, _toDate]);

  // ===== Egresos (solo manuales) =====
  const egresosManual = useMemo(() => {
    return (entries || [])
      .filter((e) => e.type === "egreso")
      .filter((e) => {
        const d = _toDate(e.date);
        return d ? sameDay(d, selected) : false;
      })
      .map((e) => ({
        journalId: e.id || null,
        concept: e.concept,
        amount: Number(e.amount || 0),
        date: _toDate(e.date) || selected,
      }));
  }, [entries, selected, _toDate]);

  // Totales del día
  const totalIngresos = useMemo(
    () => [...incomesFromPayments, ...manualIngresos].reduce((acc, i) => acc + Number(i.amount || 0), 0),
    [incomesFromPayments, manualIngresos]
  );
  const totalEgresos = useMemo(
    () => egresosManual.reduce((acc, i) => acc + Number(i.amount || 0), 0),
    [egresosManual]
  );

  // ===== Finalizar día → guarda en "journal_days" =====
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
          concept: i.concept,
          orderId: i.orderId,
          orderName: i.orderName,
          paymentId: i.paymentId,
        })),
        ...manualIngresos.map((i) => ({
          source: "manual" as const,
          amount: i.amount,
          concept: i.concept,
          journalId: i.journalId || null,
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
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenIngreso(true)}>Registrar ingreso</Button>
          <Button variant="destructive" onClick={() => setOpenEgreso(true)}>Registrar egreso</Button>
          <Button variant="outline" onClick={handleFinalizarDia}>Finalizar día</Button>
        </div>
      </div>

      {/* Totales del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-sm">Ingresos (día)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700">{fmtBs(totalIngresos)}</CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-sm">Egresos (día)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-rose-700">{fmtBs(totalEgresos)}</CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="text-sm">Neto</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{fmtBs(totalIngresos - totalEgresos)}</CardContent>
        </Card>
      </div>

      {/* TABLA: Ingresos (pagos + manuales) */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ingresos</CardTitle>
          <p className="text-sm text-muted-foreground">Pagos del día + ingresos manuales.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-background/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-6">Cargando…</TableCell></TableRow>
                )}

                {incomesFromPayments.map((i) => (
                  <TableRow key={`pay-${i.paymentId}`}>
                    <TableCell>Pago</TableCell>
                    <TableCell>{i.orderName}</TableCell>
                    <TableCell className="max-w-[420px] truncate">{i.concept}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBs(i.amount)}</TableCell>
                  </TableRow>
                ))}

                {manualIngresos.map((i) => (
                  <TableRow key={`man-in-${i.journalId ?? Math.random()}`}>
                    <TableCell>Manual</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="max-w-[420px] truncate">{i.concept}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBs(i.amount)}</TableCell>
                  </TableRow>
                ))}

                {!loading && incomesFromPayments.length + manualIngresos.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-6">Sin ingresos para la fecha.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* TABLA: Egresos (manuales) */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Egresos</CardTitle>
          <p className="text-sm text-muted-foreground">Solo egresos manuales del diario.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-background/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={2} className="text-center py-6">Cargando…</TableCell></TableRow>
                )}

                {egresosManual.map((e) => (
                  <TableRow key={`man-eg-${e.journalId ?? Math.random()}`}>
                    <TableCell className="max-w-[520px] truncate">{e.concept}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBs(e.amount)}</TableCell>
                  </TableRow>
                ))}

                {!loading && egresosManual.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center py-6">Sin egresos para la fecha.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Ingreso */}
      <Dialog open={openIngreso} onOpenChange={setOpenIngreso}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar ingreso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input inputMode="decimal" value={formIngreso.amount} onChange={(e) => setFormIngreso((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input value={formIngreso.concept} onChange={(e) => setFormIngreso((f) => ({ ...f, concept: e.target.value }))} placeholder="Ej: Ingreso por servicio" />
            </div>
            <Button onClick={handleSaveIngreso} className="w-full">Guardar ingreso</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Egreso */}
      <Dialog open={openEgreso} onOpenChange={setOpenEgreso}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar egreso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input inputMode="decimal" value={formEgreso.amount} onChange={(e) => setFormEgreso((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input value={formEgreso.concept} onChange={(e) => setFormEgreso((f) => ({ ...f, concept: e.target.value }))} placeholder="Ej: Compra de insumos" />
            </div>
            <Button variant="destructive" onClick={handleSaveEgreso} className="w-full">Guardar egreso</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


//CAMBIAR ISOLOGO E ICONO DE LA PAGINA