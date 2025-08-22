import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Download, FileDown, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrders } from "@/hooks/useOrders";
import { usePayments } from "@/hooks/usePayments";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";

// --- helpers ---
const fmtBs = (n: number | string) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(Number(n) || 0);

const tsToMs = (v: any): number => {
  if (!v) return 0;
  if (typeof v === "object" && typeof v.seconds === "number")
    return v.seconds * 1000;
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const fmtDate = (v: any): string => {
  if (!v) return "—";
  if (typeof v === "object" && typeof v.seconds === "number") {
    const d = new Date(v.seconds * 1000);
    return d.toLocaleDateString("es-BO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("es-BO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

type Period = "diario" | "semanal" | "mensual" | "personalizado";

export default function Reports() {
  const { orders, loading: loadingOrders } = useOrders();
  const { payments, loading: loadingPayments } = usePayments();
  const { services } = useServices();
  const { clients } = useClients();

  // --- filtros ---
  const [period, setPeriod] = useState<Period>("diario");
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    return startOfDay(d).toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => {
    const d = new Date();
    return endOfDay(d).toISOString().slice(0, 10);
  });

  // autoajustar rango al cambiar periodo
  useEffect(() => {
    const today = new Date();
    if (period === "diario") {
      setFrom(startOfDay(today).toISOString().slice(0, 10));
      setTo(endOfDay(today).toISOString().slice(0, 10));
    } else if (period === "semanal") {
      const start = startOfDay(new Date(today));
      start.setDate(start.getDate() - 6); // últimos 7 días incluyendo hoy
      setFrom(start.toISOString().slice(0, 10));
      setTo(endOfDay(today).toISOString().slice(0, 10));
    } else if (period === "mensual") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endOfDay(
        new Date(today.getFullYear(), today.getMonth() + 1, 0)
      );
      setFrom(start.toISOString().slice(0, 10));
      setTo(end.toISOString().slice(0, 10));
    }
  }, [period]);

  const range = useMemo(() => {
    const start = startOfDay(new Date(from));
    const end = endOfDay(new Date(to));
    return { startMs: start.getTime(), endMs: end.getTime() };
  }, [from, to]);

  // --- catálogos ---
  const clientById = useMemo(() => {
    const m: Record<string, (typeof clients)[number]> = {};
    (clients || []).forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  const serviceById = useMemo(() => {
    const m: Record<string, (typeof services)[number]> = {};
    (services || []).forEach((s) => (m[s.id] = s));
    return m;
  }, [services]);

  const orderById = useMemo(() => {
    const m: Record<string, (typeof orders)[number]> = {};
    (orders || []).forEach((o) => (m[o.id] = o));
    return m;
  }, [orders]);

  // --- datos por rango ---
  const paymentsInRange = useMemo(() => {
    return (payments || []).filter((p: any) => {
      const t = tsToMs(p.createdAt);
      return t >= range.startMs && t <= range.endMs;
    });
  }, [payments, range]);

  const ordersInRange = useMemo(() => {
    return (orders || []).filter((o: any) => {
      const t = tsToMs(o.createdAt) || tsToMs(o.startDate);
      return t >= range.startMs && t <= range.endMs;
    });
  }, [orders, range]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    const ingresos =
      paymentsInRange.reduce(
        (acc: number, p: any) => acc + Number(p.amount || 0),
        0
      ) || 0;

    const ordenesNuevas = ordersInRange.length;

    const facturado =
      ordersInRange.reduce(
        (acc: number, o: any) => acc + Number(o.total || 0),
        0
      ) || 0;

    const ticketPromedio =
      ordenesNuevas > 0 ? facturado / ordenesNuevas : 0;

    const completadas = ordersInRange.filter(
      (o: any) => o.status === "completado"
    ).length;
    const pctCompletadas =
      ordenesNuevas > 0 ? (completadas / ordenesNuevas) * 100 : 0;

    const saldoPeriodo =
      ordersInRange.reduce(
        (acc: number, o: any) => acc + Number(o.balance || 0),
        0
      ) || 0;

    return {
      ingresos,
      ordenesNuevas,
      facturado,
      ticketPromedio,
      pctCompletadas,
      saldoPeriodo,
    };
  }, [paymentsInRange, ordersInRange]);

  // --- top servicios ---
  const topServicios = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    ordersInRange.forEach((o: any) => {
      const s = serviceById[o.serviceId];
      const key = o.serviceId || "—";
      if (!map.has(key))
        map.set(key, { name: s?.name || "—", total: 0, count: 0 });
      const entry = map.get(key)!;
      entry.total += Number(o.total || 0);
      entry.count += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [ordersInRange, serviceById]);

  // --- exportaciones ---
  const downloadCSV = () => {
    // Mantenemos CSV financiero (libro diario), por si quieres abrir en Excel.
    const header = ["Fecha", "OrdenID", "Cliente", "Método", "Monto", "Nota"];
    const rows = paymentsInRange.map((p: any) => {
      const o = orderById[p.orderId || ""];
      const cName = o ? clientById[o.clientId]?.name || "" : "";
      return [
        fmtDate(p.createdAt),
        p.orderId || "",
        (cName || "").replace(/,/g, " "),
        (p.method || "").toString().toUpperCase(),
        Number(p.amount || 0).toFixed(2),
        (p.note || "").toString().replace(/[\r\n,]+/g, " "),
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `libro_diario_${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const marginX = 12;
    const pageW = doc.internal.pageSize.getWidth();
    const contentW = pageW - marginX * 2;
    const line = 6;

    const hr = (y: number) => {
      doc.setDrawColor(200);
      doc.line(marginX, y, pageW - marginX, y);
    };

    const kv = (label: string, value: string, y: number) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, marginX, y);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageW - marginX, y, { align: "right" });
    };

    let y = 16;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Reporte • Libro Diario", marginX, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Periodo: ${fmtDate(from)} — ${fmtDate(to)}`,
      pageW - marginX,
      y,
      { align: "right" }
    );
    y += line;
    hr(y);
    y += 4;

    // KPIs
    doc.setFontSize(11);
    kv("Ingresos (pagos)", fmtBs(kpis.ingresos), y);
    y += line;
    kv("Órdenes nuevas", String(kpis.ordenesNuevas), y);
    y += line;
    kv("Facturado (órdenes)", fmtBs(kpis.facturado), y);
    y += line;
    kv("Ticket promedio", fmtBs(kpis.ticketPromedio), y);
    y += line;
    kv("Completadas (%)", `${kpis.pctCompletadas.toFixed(1)}%`, y);
    y += line;
    kv("Saldo pendiente (en periodo)", fmtBs(kpis.saldoPeriodo), y);
    y += line;
    y += 2;
    hr(y);
    y += 6;

    // Top servicios
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top servicios (por facturación)", marginX, y);
    y += line;

    if (topServicios.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("No hay datos para el periodo.", marginX, y);
      y += line;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      topServicios.forEach((s) => {
        kv(`${s.name} (x${s.count})`, fmtBs(s.total), y);
        y += line;
      });
    }

    y += 2;
    hr(y);
    y += 6;

    // Libro diario (ahora columnas: Servicio, Cliente, Fecha, Estado)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Libro diario (pagos del periodo)", marginX, y);
    y += line;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const cols = [
      { key: "servicio", w: 60, align: "left" as const },
      { key: "cliente", w: Math.max(60, contentW - (60 + 26 + 26)), align: "left" as const },
      { key: "fecha", w: 26, align: "left" as const },
      { key: "estado", w: 26, align: "left" as const },
    ];
    let x = marginX;
    ["Servicio", "Cliente", "Fecha", "Estado"].forEach((h, i) => {
      const c = cols[i];
      doc.text(h, x + (c.align === "right" ? c.w : 0), y, { align: c.align });
      x += c.w;
    });
    y += 4;
    hr(y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const addRow = (serv: string, cli: string, fec: string, est: string) => {
      // salto de página
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
      const wrap = (txt: string, w: number) => doc.splitTextToSize(txt || "—", w);

      const tServ = wrap(serv, cols[0].w);
      const tCli = wrap(cli, cols[1].w);
      const rowHeight = Math.max(tServ.length, tCli.length) * 4 + 2;

      let xi = marginX;
      // Servicio
      tServ.forEach((ln, idx) => {
        doc.text(ln, xi, y + idx * 4);
      });
      xi += cols[0].w;

      // Cliente
      tCli.forEach((ln, idx) => {
        doc.text(ln, xi, y + idx * 4);
      });
      xi += cols[1].w;

      // Fecha
      doc.text(fec, xi, y);
      xi += cols[2].w;

      // Estado
      doc.text(est, xi, y);

      y += Math.max(rowHeight, 6);
    };

    if ((paymentsInRange || []).length === 0) {
      doc.text("No hay movimientos en el periodo.", marginX, y);
      y += line;
    } else {
      const rows = [...paymentsInRange].sort(
        (a: any, b: any) => tsToMs(a.createdAt) - tsToMs(b.createdAt)
      );

      rows.forEach((p: any) => {
        const o = orderById[p.orderId || ""];
        const servicio = o ? (serviceById[o.serviceId]?.name || "—") : "—";
        const cliente = o ? (clientById[o.clientId]?.name || "—") : "—";
        const fecha = fmtDate(p.createdAt);
        const estado = o?.status || "—";
        addRow(servicio, cliente, fecha, estado);
      });
    }

    // Footer
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generado: ${new Date().toLocaleString("es-BO")}`,
      pageW - marginX,
      y,
      { align: "right" }
    );

    doc.save(`reporte_${from}_a_${to}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground">
            Genera reportes diarios, semanales o mensuales de tu libro diario y métricas clave.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={generatePDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Generar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <Label className="mb-1 block">Periodo</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger>
                <SelectValue placeholder="Elige un periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diario</SelectItem>
                <SelectItem value="semanal">Semanal (últimos 7 días)</SelectItem>
                <SelectItem value="mensual">Mensual (mes actual)</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Desde</Label>
            <div className="relative">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={period !== "personalizado"}
              />
              <CalendarIcon className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block">Hasta</Label>
            <div className="relative">
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={period !== "personalizado"}
              />
              <CalendarIcon className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={() => { /* memos reaccionan automáticamente */ }}>
              Aplicar
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card/80">
          <p className="text-xs text-muted-foreground">Ingresos (pagos)</p>
          <p className="text-2xl font-bold">{fmtBs(kpis.ingresos)}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card/80">
          <p className="text-xs text-muted-foreground">Órdenes nuevas</p>
          <p className="text-2xl font-bold">{kpis.ordenesNuevas}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card/80">
          <p className="text-xs text-muted-foreground">Facturado (órdenes)</p>
          <p className="text-2xl font-bold">{fmtBs(kpis.facturado)}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card/80">
          <p className="text-xs text-muted-foreground">Ticket promedio</p>
          <p className="text-2xl font-bold">{fmtBs(kpis.ticketPromedio)}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card/80">
          <p className="text-xs text-muted-foreground">Completadas (%)</p>
          <p className="text-2xl font-bold">{kpis.pctCompletadas.toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded-lg border bg-card/80">
          <p className="text-xs text-muted-foreground">Saldo pendiente (en periodo)</p>
          <p className="text-2xl font-bold">{fmtBs(kpis.saldoPeriodo)}</p>
        </div>
      </div>

      {/* Top servicios */}
      <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border shadow-soft">
        <h3 className="text-base font-semibold mb-4">Top servicios (por facturación)</h3>
        {topServicios.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay datos para el periodo.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead className="w-24">Órdenes</TableHead>
                <TableHead className="text-right w-40">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topServicios.map((s) => (
                <TableRow key={s.name}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.count}</TableCell>
                  <TableCell className="text-right">{fmtBs(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Libro diario (pagos del periodo) — columnas: Servicio, Cliente, Fecha, Estado */}
      <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg border shadow-soft">
        <h3 className="text-base font-semibold mb-4">Libro diario (pagos del periodo)</h3>
        {loadingPayments ? (
          <div className="p-8 text-center">Cargando pagos…</div>
        ) : (paymentsInRange || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay movimientos en el periodo.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...paymentsInRange]
                .sort((a: any, b: any) => tsToMs(a.createdAt) - tsToMs(b.createdAt))
                .map((p: any) => {
                  const o = orderById[p.orderId || ""];
                  const servicio = o ? (serviceById[o.serviceId]?.name || "—") : "—";
                  const cliente = o ? (clientById[o.clientId]?.name || "—") : "—";
                  const fecha = fmtDate(p.createdAt);
                  const estado = o?.status || "—";
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{servicio}</TableCell>
                      <TableCell>{cliente}</TableCell>
                      <TableCell>{fecha}</TableCell>
                      <TableCell>{estado}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
