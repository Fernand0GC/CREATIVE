// src/pages/Orders.tsx
import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Eye, FileDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useOrders } from "@/hooks/useOrders";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { usePayments } from "@/hooks/usePayments";
import { Order } from "@/types/order";
import { jsPDF } from "jspdf";

// ---------- helpers ----------
const fmtBs = (n: number | string) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(Number(n) || 0);

const tsToMs = (v: any): number => {
  if (!v) return 0;
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const fmtDate = (v: any): string => {
  if (!v) return "—";
  if (typeof v === "object" && typeof v.seconds === "number") {
    const d = new Date(v.seconds * 1000);
    return d.toLocaleDateString("es-BO", { year: "numeric", month: "2-digit", day: "2-digit" });
  }
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("es-BO", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const normalizeText = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const digits = (s: string) => (s || "").replace(/\D/g, "");

// YYYY-MM-DD => ms (00:00 local)
const ymdToMs = (ymd: string) => {
  if (!ymd) return NaN;
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  if (!y || !m || !d) return NaN;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.getTime();
};

export default function OrdersPage() {
  const {
    orders,
    loading,
    createOrder,
    createOrderWithServiceResolution, // creación con servicio nuevo
    updateOrder,
    deleteOrder,
  } = useOrders();
  const { clients, createClient, findClientByPhone } = useClients();
  const { services } = useServices();
  const { payments, registerPayment } = usePayments(); // pagos solo para ver en modal (NO se imprimen en PDF)

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // ---------- FORM ----------
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    serviceId: "",
    serviceName: "", // texto libre para servicio nuevo
    startDate: new Date().toISOString().split("T")[0],
    expectedEndDate: "",
    details: "",
    deposit: 0,
    total: 0,
    quantity: 1,
  });

  // ---------- FILTROS ----------
  const [searchText, setSearchText] = useState(""); // cliente o celular
  const [statusFilter, setStatusFilter] = useState<"todos" | Order["status"]>("todos");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("todos");
    setDateFrom("");
    setDateTo("");
  };

  // toggle de estado (evitar clics múltiples mientras guarda)
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const STATUSES: Order["status"][] = ["pendiente", "completado", "cancelado"];
  const nextStatus = (s: Order["status"]) => {
    const i = STATUSES.indexOf(s);
    return STATUSES[(i + 1) % STATUSES.length];
  };

  // buscador de servicios del form
  const [serviceQuery, setServiceQuery] = useState("");

  const filteredServices = useMemo(() => {
    const q = normalizeText(serviceQuery);
    if (q.length < 2) return [];
    return services.filter((s) => normalizeText(s.name).includes(q));
  }, [serviceQuery, services]);

  const resetForm = () => {
    setFormData({
      clientName: "",
      clientPhone: "",
      serviceId: "",
      serviceName: "",
      startDate: new Date().toISOString().split("T")[0],
      expectedEndDate: "",
      details: "",
      deposit: 0,
      total: 0,
      quantity: 1,
    });
    setEditingOrder(null);
    setServiceQuery("");
  };

  // ---------- catálogos ----------
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

  const selectedServiceName = useMemo(
    () => (formData.serviceId ? serviceById[formData.serviceId]?.name || "" : ""),
    [formData.serviceId, serviceById]
  );

  // recalcular total al cambiar servicio o cantidad (solo si hay serviceId)
  useEffect(() => {
    if (!formData.serviceId) return;
    const svc = serviceById[formData.serviceId];
    if (!svc) return;
    setFormData((fd) => ({
      ...fd,
      total: Number(svc.price || 0) * Number(fd.quantity || 1),
    }));
  }, [formData.serviceId, formData.quantity, serviceById]);

  // ---------- ordenar por fecha reciente ----------
  const baseSortedOrders = useMemo(() => {
    const arr = [...(orders || [])];
    arr.sort(
      (a, b) =>
        tsToMs(b.createdAt) - tsToMs(a.createdAt) ||
        tsToMs(b.startDate) - tsToMs(a.startDate)
    );
    return arr;
  }, [orders]);

  // ---------- aplicar filtros y búsqueda ----------
  const filteredSortedOrders = useMemo(() => {
    const qText = normalizeText(searchText);
    const qDigits = digits(searchText);

    const fromMs = ymdToMs(dateFrom);
    const toMs = ymdToMs(dateTo);
    // si el usuario coloca fecha fin, incluimos todo ese día sumando 1 día menos 1 ms
    const toMsInclusive = isNaN(toMs) ? NaN : toMs + 24 * 60 * 60 * 1000 - 1;

    return baseSortedOrders.filter((o) => {
      // filtro por estado
      if (statusFilter !== "todos" && o.status !== statusFilter) return false;

      // filtro por fechas (por startDate)
      if (dateFrom || dateTo) {
        const oMs = ymdToMs(o.startDate);
        if (!isNaN(fromMs) && (isNaN(oMs) || oMs < fromMs)) return false;
        if (!isNaN(toMsInclusive) && (isNaN(oMs) || oMs > toMsInclusive)) return false;
      }

      // búsqueda por cliente o celular
      if (qText || qDigits) {
        const cli = clientById[o.clientId];
        const name = normalizeText(cli?.name || "");
        const phone = digits(cli?.phone || "");
        const matchText = qText ? name.includes(qText) : false;
        const matchPhone = qDigits ? phone.includes(qDigits) : false;
        if (!matchText && !matchPhone) return false;
      }

      return true;
    });
  }, [baseSortedOrders, statusFilter, dateFrom, dateTo, searchText, clientById]);

  // ---------- submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.clientName.trim()) return alert("Ingresa el nombre del cliente.");
    if (!formData.clientPhone.trim()) return alert("Ingresa el teléfono.");
    if (!formData.serviceId && !formData.serviceName.trim())
      return alert("Selecciona un servicio o escribe uno nuevo.");
    if (formData.total < 0) return alert("El total no puede ser negativo.");
    if (formData.deposit < 0) return alert("El abono no puede ser negativo.");
    if (formData.deposit > formData.total)
      return alert("El abono no puede exceder el total.");
    if (formData.quantity < 1) return alert("La cantidad mínima es 1.");

    // Cliente
    let clientId = "";
    const existingClient = await findClientByPhone(formData.clientPhone);
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      clientId = await createClient({
        name: formData.clientName,
        phone: formData.clientPhone,
      });
    }

    // Crear / Actualizar
    if (editingOrder) {
      await updateOrder(editingOrder.id, {
        clientId,
        serviceId: formData.serviceId, // al editar mantenemos serviceId
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        details: formData.details,
        deposit: editingOrder.deposit, // abonos solo vía pagos
        total: formData.total,
        balance: Math.max(0, Number(formData.total) - Number(editingOrder.deposit || 0)),
        status: editingOrder.status,
        quantity: formData.quantity,
      });
    } else {
      let orderId = "";

      if (formData.serviceId) {
        // servicio existente
        orderId = await createOrder({
          clientId,
          serviceId: formData.serviceId,
          startDate: formData.startDate,
          expectedEndDate: formData.expectedEndDate,
          details: formData.details,
          total: formData.total,
          deposit: 0,
          balance: formData.total,
          status: "pendiente",
          quantity: formData.quantity,
        });
      } else {
        // servicio nuevo por nombre libre
        orderId = await createOrderWithServiceResolution({
          clientId,
          serviceName: formData.serviceName.trim(),
          startDate: formData.startDate,
          expectedEndDate: formData.expectedEndDate,
          details: formData.details,
          total: formData.total,
          deposit: 0,
          balance: formData.total,
          status: "pendiente",
          quantity: formData.quantity,
        });
      }

      if (formData.deposit > 0) {
        await registerPayment(orderId, formData.deposit, "efectivo", "Abono inicial");
      }
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (order: Order) => {
    const cli = clientById[order.clientId];
    setEditingOrder(order);
    setFormData({
      clientName: cli?.name || "",
      clientPhone: cli?.phone || "",
      serviceId: order.serviceId,
      serviceName: "", // al editar, usamos el servicio existente
      startDate: order.startDate,
      expectedEndDate: order.expectedEndDate,
      details: order.details,
      deposit: Number(order.deposit) || 0,
      total: Number(order.total) || 0,
      quantity: Number(order.quantity ?? 1),
    });
    const svcName = serviceById[order.serviceId]?.name || "";
    setServiceQuery(svcName);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar esta orden?")) return;
    await deleteOrder(id);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium";
      case "completado":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium";
      case "cancelado":
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium";
      default:
        return "";
    }
  };

  // pagos por orden (solo para mostrar en el modal)
  const paymentsByOrder = useMemo(() => {
    const map = new Map<string, any[]>();
    (payments || []).forEach((p: any) => {
      const key = p.orderId || "";
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    for (const [, arr] of map) {
      arr.sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));
    }
    return map;
  }, [payments]);

  // ---------- Generar PDF térmico (sin lista de pagos, diseño mejorado) ----------
  const generateThermalPDF = (order: Order) => {
    const client = clientById[order.clientId];
    const service = serviceById[order.serviceId];

    // Configuración base
    const PAPER_WIDTH_MM = 80;     // cambia a 58 si tu rollo es de 58 mm
    const marginX = 5;
    const contentWidth = PAPER_WIDTH_MM - marginX * 2;

    // Estilos
    const line = 5;        // alto de línea
    const fontTitle = 12;
    const fontNormal = 9;
    const fontSmall = 8;

    // Prepara contenido con autoajuste de altura
    const doc = new jsPDF({ unit: "mm", format: [PAPER_WIDTH_MM, 200] });

    const split = (t: string) => doc.splitTextToSize(t, contentWidth);

    const infoBlocks = [
      ...split(`Cliente: ${client?.name || "—"}`),
      ...split(`Teléfono: ${client?.phone || "—"}`),
      ...split(`Servicio: ${service?.name || (order as any)?.serviceName || "—"}`),
      ...split(`Cantidad: ${order.quantity ?? 1}`),
      ...split(`Fecha inicio: ${order.startDate || "—"}`),
      ...split(`Fecha estimada: ${order.expectedEndDate || "—"}`),
      "",
      ...split(`Detalles: ${order.details || "—"}`),
    ];

    // Cálculo de altura aproximada
    const headH = line + 4; // para el título y separadores
    const bodyH = infoBlocks.length * line + 4;
    const totalsH = line * 3 + 8; // tres filas + padding
    const footerH = line + 6;
    const estHeight = Math.max(120, headH + bodyH + totalsH + footerH);

    // Re-crear doc con altura estimada
    const pdf = new jsPDF({ unit: "mm", format: [PAPER_WIDTH_MM, estHeight] });

    // Helpers de dibujo
    const hr = (y: number) => {
      pdf.setDrawColor(180);
      pdf.line(marginX, y, PAPER_WIDTH_MM - marginX, y);
    };

    const kv = (label: string, value: string, y: number) => {
      // etiqueta izquierda, valor derecha
      pdf.setFont("helvetica", "normal");
      pdf.text(label, marginX, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(value, PAPER_WIDTH_MM - marginX, y, { align: "right" });
    };

    const badge = (text: string, y: number) => {
      // “chapita” del estado
      const padX = 3;
      const padY = 1.5;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const w = pdf.getTextWidth(text) + padX * 2;
      const x = (PAPER_WIDTH_MM - w) / 2;
      pdf.setDrawColor(120);
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(x, y - 4, w, 6.5, 1.2, 1.2, "FD");
      pdf.setTextColor(70);
      pdf.text(text, PAPER_WIDTH_MM / 2, y, { align: "center", baseline: "middle" as any });
      pdf.setTextColor(0);
    };

    let y = 8;

    // Título
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(fontTitle);
    pdf.text("ORDEN DE TRABAJO", PAPER_WIDTH_MM / 2, y, { align: "center" });
    y += line;
    hr(y);
    y += 2;

    // Chapita con el estado
    badge(String(order.status || "pendiente").toUpperCase(), y + 2);
    y += 8;

    // Info
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontNormal);
    infoBlocks.forEach((ln) => {
      if (ln === "") {
        y += 2;
        hr(y);
        y += 2;
      } else {
        pdf.text(ln as string, marginX, y);
        y += line;
      }
    });

    y += 2;
    hr(y);
    y += 2;

    // Totales (bloque con borde)
    const boxX = marginX;
    const boxW = contentWidth;
    const boxH = line * 3 + 4;
    pdf.setDrawColor(160);
    pdf.roundedRect(boxX, y, boxW, boxH, 1.5, 1.5);

    let yTotals = y + line;
    kv("Total", fmtBs(order.total), yTotals);
    yTotals += line;
    kv("Abonos", fmtBs(order.deposit), yTotals);
    yTotals += line;
    kv("Saldo", fmtBs(order.balance), yTotals);
    y += boxH + 4;

    hr(y);
    y += line - 2;

    // Footer
    pdf.setFontSize(fontSmall);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `ID: ${order.id} • Generado: ${new Date().toLocaleString("es-BO")}`,
      PAPER_WIDTH_MM / 2,
      y,
      { align: "center" }
    );

    // Descargar
    pdf.save(`orden_${order.id || "sin_id"}.pdf`);
  };

  // Toggle al hacer clic en el chip de estado
  const handleToggleStatus = async (order: Order) => {
    if (togglingStatusId) return; // evita doble clic mientras guarda
    const newStatus = nextStatus(order.status);
    try {
      setTogglingStatusId(order.id);
      await updateOrder(order.id, { status: newStatus });
      // updateOrder ya refresca la lista (getOrders dentro del hook)
    } catch (err) {
      console.error("No se pudo cambiar el estado:", err);
      alert("No se pudo cambiar el estado. Intenta de nuevo.");
    } finally {
      setTogglingStatusId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Órdenes de trabajo</h1>
          <p className="text-muted-foreground">Gestiona todas las órdenes de trabajo de tu negocio.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "Editar orden" : "Nueva orden"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del cliente</Label>
                  <Input
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData({ ...formData, clientName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.clientPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, clientPhone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* Servicio + buscador / texto libre */}
              <div>
                <Label>Servicio</Label>
                <div className="rounded-lg border">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar o escribir servicio..."
                      value={
                        formData.serviceId
                          ? selectedServiceName
                          : serviceQuery || formData.serviceName
                      }
                      onValueChange={(v) => {
                        setServiceQuery(v);
                        setFormData((fd) => ({
                          ...fd,
                          serviceId: "",      // si escribe, limpiamos selección
                          serviceName: v,     // guardamos nombre libre
                          total: fd.serviceId ? 0 : fd.total, // si estaba seleccionado, resetea total
                          deposit: fd.serviceId ? 0 : fd.deposit,
                        }));
                      }}
                    />
                    <CommandList>
                      {!formData.serviceId && (serviceQuery.trim().length < 2) ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Escribe al menos <b>2</b> letras para buscar o deja el nombre para crearlo.
                        </div>
                      ) : !formData.serviceId && filteredServices.length === 0 ? (
                        <>
                          <CommandEmpty>Sin resultados.</CommandEmpty>
                          {serviceQuery.trim().length >= 2 && (
                            <div className="p-3 text-sm">
                              ¿Crear servicio nuevo como:{" "}
                              <b className="break-all">{serviceQuery.trim()}</b>?
                              <div className="mt-2 text-xs text-muted-foreground">
                                Se creará automáticamente al guardar la orden.
                              </div>
                            </div>
                          )}
                        </>
                      ) : !formData.serviceId ? (
                        <CommandGroup heading="Resultados">
                          {filteredServices.map((service) => (
                            <CommandItem
                              key={service.id}
                              value={service.name}
                              onSelect={() => {
                                setFormData((fd) => ({
                                  ...fd,
                                  serviceId: service.id,
                                  serviceName: "",
                                  total: Number(service.price || 0) * Number(fd.quantity || 1),
                                  deposit: 0,
                                }));
                                setServiceQuery(service.name);
                              }}
                              className="flex justify-between"
                            >
                              <span>{service.name}</span>
                              <span className="text-muted-foreground">
                                {fmtBs(service.price)}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : null}
                    </CommandList>
                  </Command>

                  {formData.serviceId ? (
                    <div className="flex items-center justify-between px-3 py-2 border-t text-sm text-muted-foreground">
                      <span>
                        Seleccionado: <b>{selectedServiceName || "—"}</b>
                      </span>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => {
                          setFormData((fd) => ({
                            ...fd,
                            serviceId: "",
                            serviceName: serviceQuery || "",
                            total: 0,
                            deposit: 0,
                          }));
                          setServiceQuery("");
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-2 border-t text-xs text-muted-foreground">
                      Si el servicio no existe, <b>lo crearemos automáticamente</b> al guardar.
                    </div>
                  )}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Math.max(1, Number(e.target.value || 1)),
                    })
                  }
                  min={1}
                />
              </div>

              {/* Detalles */}
              <div>
                <Label>Detalles adicionales</Label>
                <Textarea
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                />
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de inicio</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Fecha estimada</Label>
                  <Input
                    type="date"
                    value={formData.expectedEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedEndDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Pagos */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Total</Label>
                  <Input
                    type="number"
                    value={formData.total}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total: Number(e.target.value || 0),
                      })
                    }
                    min={0}
                  />
                </div>

                <div>
                  <Label>Abono</Label>
                  <Input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deposit: Number(e.target.value || 0),
                      })
                    }
                    min={0}
                    disabled={!!editingOrder}
                  />
                  {!!editingOrder && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Para abonar usa “Registrar pago”. Este campo se deshabilita al editar.
                    </p>
                  )}
                </div>

                <div>
                  <Label>Saldo</Label>
                  <Input
                    value={Math.max(
                      0,
                      Number(formData.total) -
                      Number(editingOrder ? editingOrder.deposit : formData.deposit)
                    )}
                    disabled
                  />
                </div>
              </div>

              {/* Estado al editar */}
              {editingOrder && (
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={editingOrder.status}
                    onValueChange={(value) =>
                      setEditingOrder({
                        ...editingOrder,
                        status: value as Order["status"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" className="w-full">
                {editingOrder ? "Actualizar orden" : "Crear orden"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-card/60 backdrop-blur-sm rounded-lg border p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <Label className="mb-1 block">Buscar por cliente o celular</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Ej.: Juan / 70012345"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchText("")}
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <div>
            <Label className="mb-1 block">Estado</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div>
            <Label className="mb-1 block">Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="flex items-end">
          <Button variant="secondary" onClick={clearFilters}>
            Limpiar
          </Button>
        </div>
      </div>

      {/* Conteo resultados */}
      <div className="text-sm text-muted-foreground">
        Mostrando <b>{filteredSortedOrders.length}</b> de {orders.length} órdenes
      </div>

      {/* Tabla principal */}
      <div className="bg-card/80 backdrop-blur-sm rounded-lg border shadow-soft">
        {loading ? (
          <div className="p-8 text-center">Cargando órdenes...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Trabajo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Abono</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSortedOrders.map((order) => {
                const client = clientById[order.clientId];
                const service = serviceById[order.serviceId];
                const isSaving = togglingStatusId === order.id;

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{client?.name || "—"}</span>
                        <span className="text-xs text-muted-foreground">{client?.phone || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{service?.name || "—"}</TableCell>
                    <TableCell>{order.quantity ?? 1}</TableCell>
                    <TableCell>{fmtBs(order.total)}</TableCell>
                    <TableCell>{fmtBs(order.deposit)}</TableCell>
                    <TableCell>{fmtBs(order.balance)}</TableCell>
                    <TableCell>
                      <span
                        role="button"
                        tabIndex={0}
                        title="Cambiar estado"
                        onClick={() => handleToggleStatus(order)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleToggleStatus(order);
                        }}
                        className={[
                          getStatusStyle(order.status),
                          "inline-flex items-center cursor-pointer select-none transition",
                          "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                          isSaving ? "opacity-50 pointer-events-none" : "",
                        ].join(" ")}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingOrder(order)} // 👁️ ver detalles
                        aria-label="Ver detalles"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(order)}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(order.id)}
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredSortedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No hay órdenes que coincidan con tu búsqueda/filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal de detalles (incluye botón PDF; la lista de pagos solo se ve aquí, NO se imprime) */}
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Detalles de la orden</DialogTitle>
            {viewingOrder && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generateThermalPDF(viewingOrder)}
                className="gap-2"
                title="Generar PDF para impresora térmica"
              >
                <FileDown className="h-4 w-4" />
                Generar PDF (térmica)
              </Button>
            )}
          </DialogHeader>

          {viewingOrder && (
            <div className="space-y-6">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><b>Cliente:</b> {clientById[viewingOrder.clientId]?.name || "—"}</p>
                  <p><b>Teléfono:</b> {clientById[viewingOrder.clientId]?.phone || "—"}</p>
                  <p><b>Servicio:</b> {serviceById[viewingOrder.serviceId]?.name || "—"}</p>
                  <p><b>Cantidad:</b> {viewingOrder.quantity ?? 1}</p>
                </div>
                <div>
                  <p><b>Fecha inicio:</b> {viewingOrder.startDate || "—"}</p>
                  <p><b>Fecha estimada:</b> {viewingOrder.expectedEndDate || "—"}</p>
                  <p><b>Estado:</b> {viewingOrder.status}</p>
                </div>
                <div className="col-span-2">
                  <p><b>Detalles:</b></p>
                  <p className="text-muted-foreground">{viewingOrder.details || "—"}</p>
                </div>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{fmtBs(viewingOrder.total)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground">Abonos (en orden)</p>
                  <p className="text-lg font-semibold">{fmtBs(viewingOrder.deposit)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="text-lg font-semibold">{fmtBs(viewingOrder.balance)}</p>
                </div>
              </div>

              {/* Pagos visibles en modal (no en PDF) */}
              <div>
                <h3 className="text-base font-medium mb-2">Pagos registrados</h3>
                {(() => {
                  const list = paymentsByOrder.get(viewingOrder.id) || [];
                  return (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Nota</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.length > 0 ? (
                            list.map((p: any) => (
                              <TableRow key={p.id}>
                                <TableCell>{fmtDate(p.createdAt)}</TableCell>
                                <TableCell className="capitalize">{p.method || "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{p.note || "—"}</TableCell>
                                <TableCell className="text-right">{fmtBs(p.amount)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No hay pagos registrados.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
