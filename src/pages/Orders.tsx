// src/pages/Orders.tsx
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

export default function OrdersPage() {
  const { orders, loading, createOrder, updateOrder, deleteOrder } = useOrders();
  const { clients, createClient, findClientByPhone } = useClients();
  const { services } = useServices();
  const { registerPayment } = usePayments();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    serviceId: "",
    startDate: new Date().toISOString().split("T")[0],
    expectedEndDate: "",
    details: "",
    deposit: 0,
    total: 0,
  });

  // 🔎 estado del buscador de servicios
  const [serviceQuery, setServiceQuery] = useState("");

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim();
    if (q.length < 2) return [];
    return services.filter((s) => normalize(s.name).includes(normalize(q)));
  }, [serviceQuery, services]);

  const resetForm = () => {
    setFormData({
      clientName: "",
      clientPhone: "",
      serviceId: "",
      startDate: new Date().toISOString().split("T")[0],
      expectedEndDate: "",
      details: "",
      deposit: 0,
      total: 0,
    });
    setEditingOrder(null);
    setServiceQuery(""); // ✅ limpiar buscador
  };

  // ---------- catálogos en O(1) ----------
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

  // nombre del servicio actualmente seleccionado (si lo hay)
  const selectedServiceName = useMemo(
    () => (formData.serviceId ? serviceById[formData.serviceId]?.name || "" : ""),
    [formData.serviceId, serviceById]
  );

  // ---------- ordena por fecha más reciente ----------
  const sortedOrders = useMemo(() => {
    const arr = [...(orders || [])];
    arr.sort(
      (a, b) =>
        tsToMs(b.createdAt) - tsToMs(a.createdAt) ||
        tsToMs(b.startDate) - tsToMs(a.startDate)
    );
    return arr;
  }, [orders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones rápidas
    if (!formData.clientName.trim()) return alert("Ingresa el nombre del cliente.");
    if (!formData.clientPhone.trim()) return alert("Ingresa el teléfono.");
    if (!formData.serviceId) return alert("Selecciona un servicio.");
    if (formData.total < 0) return alert("El total no puede ser negativo.");
    if (formData.deposit < 0) return alert("El abono no puede ser negativo.");
    if (formData.deposit > formData.total)
      return alert("El abono no puede exceder el total.");

    // 1) Buscar o crear cliente
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

    // 2) Crear/actualizar orden
    if (editingOrder) {
      await updateOrder(editingOrder.id, {
        clientId,
        serviceId: formData.serviceId,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        details: formData.details,
        deposit: editingOrder.deposit, // abonos solo vía pagos
        total: formData.total,
        balance: Math.max(0, Number(formData.total) - Number(editingOrder.deposit || 0)),
        status: editingOrder.status,
      });
    } else {
      const orderId = await createOrder({
        clientId,
        serviceId: formData.serviceId,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        details: formData.details,
        total: formData.total,
        deposit: 0,
        balance: formData.total,
        status: "pendiente",
      });

      if (formData.deposit > 0) {
        await registerPayment(orderId, formData.deposit, "efectivo", "Abono inicial");
      }
    }

    setIsDialogOpen(false);
    resetForm();
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Órdenes de trabajo</h1>
          <p className="text-muted-foreground">
            Gestiona todas las órdenes de trabajo de tu negocio.
          </p>
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
              <DialogTitle>
                {editingOrder ? "Editar orden" : "Nueva orden"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <Label>Servicio</Label>

                <div className="rounded-lg border">
                  <Command shouldFilter={false}>
                    {/* Muestra el nombre del seleccionado si existe, si no usa el query */}
                    <CommandInput
                      placeholder="Buscar servicio..."
                      value={serviceQuery || selectedServiceName}
                      onValueChange={(v) => {
                        setServiceQuery(v);
                        // Si vuelve a tipear, “libera” la selección para buscar de nuevo
                        if (formData.serviceId) {
                          setFormData((fd) => ({ ...fd, serviceId: "" }));
                        }
                      }}
                    />
                    <CommandList>
                      {/* Mostrar resultados solo si está buscando y no hay servicio seleccionado */}
                      {!formData.serviceId && serviceQuery.trim().length < 2 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Escribe al menos <b>2</b> letras para buscar…
                        </div>
                      ) : !formData.serviceId && filteredServices.length === 0 ? (
                        <CommandEmpty>Sin resultados.</CommandEmpty>
                      ) : !formData.serviceId ? (
                        <CommandGroup heading="Resultados">
                          {filteredServices.map((service) => (
                            <CommandItem
                              key={service.id}
                              value={service.name}
                              onSelect={() => {
                                // ✅ setear selección + rellenar input
                                setFormData((fd) => ({
                                  ...fd,
                                  serviceId: service.id,
                                  total: service.price,
                                  deposit: 0,
                                }));
                                setServiceQuery(service.name); // ✅ refleja selección en la barra
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

                  {formData.serviceId && (
                    <div className="flex items-center justify-between px-3 py-2 border-t text-sm text-muted-foreground">
                      <span>Seleccionado: <b>{selectedServiceName || "—"}</b></span>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => {
                          setFormData((fd) => ({ ...fd, serviceId: "", total: 0, deposit: 0 }));
                          setServiceQuery(""); // vuelve al modo búsqueda
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Detalles adicionales</Label>
                <Textarea
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                />
              </div>

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

      <div className="bg-card/80 backdrop-blur-sm rounded-lg border shadow-soft">
        {loading ? (
          <div className="p-8 text-center">Cargando órdenes...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Trabajo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Abono</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => {
                const client = clientById[order.clientId];
                const service = serviceById[order.serviceId];
                return (
                  <TableRow key={order.id}>
                    <TableCell>{client?.name || "—"}</TableCell>
                    <TableCell>{service?.name || "—"}</TableCell>
                    <TableCell>{fmtBs(order.total)}</TableCell>
                    <TableCell>{fmtBs(order.deposit)}</TableCell>
                    <TableCell>{fmtBs(order.balance)}</TableCell>
                    <TableCell>
                      <span className={getStatusStyle(order.status)}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingOrder(order);
                          const cli = clientById[order.clientId];
                          setFormData({
                            clientName: cli?.name || "",
                            clientPhone: cli?.phone || "",
                            serviceId: order.serviceId,
                            startDate: order.startDate,
                            expectedEndDate: order.expectedEndDate,
                            details: order.details,
                            deposit: Number(order.deposit) || 0,
                            total: Number(order.total) || 0,
                          });
                          // ✅ pre-rellenar el buscador con el nombre del servicio seleccionado
                          const svcName = serviceById[order.serviceId]?.name || "";
                          setServiceQuery(svcName);
                          setIsDialogOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(order.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No hay órdenes registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
