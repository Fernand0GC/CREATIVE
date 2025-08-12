import { useState } from "react";
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
import { cn } from "@/lib/utils";

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Buscar o crear cliente
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

    const balance = formData.total - formData.deposit;

    if (editingOrder) {
      await updateOrder(editingOrder.id, {
        clientId,
        serviceId: formData.serviceId,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        details: formData.details,
        deposit: formData.deposit,
        total: formData.total,
        balance,
        status: editingOrder.status,
      });
    } else {
      await createOrder({
        clientId,
        serviceId: formData.serviceId,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        details: formData.details,
        deposit: formData.deposit,
        total: formData.total,
        balance,
        status: "pendiente",
      });
    }

    setIsDialogOpen(false);
    resetForm();
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
                <Command className="rounded-lg border">
                  <CommandInput placeholder="Buscar servicio..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron servicios.</CommandEmpty>
                    <CommandGroup heading="Servicios disponibles">
                      {services.map((service) => (
                        <CommandItem
                          key={service.id}
                          onSelect={() =>
                            setFormData({
                              ...formData,
                              serviceId: service.id,
                              total: service.price,
                              deposit: 0,
                            })
                          }
                          className="flex justify-between"
                        >
                          <span>{service.name}</span>
                          <span className="text-muted-foreground">
                            Bs. {service.price}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
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
                      setFormData({ ...formData, expectedEndDate: e.target.value })
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
                        total: Number(e.target.value),
                      })
                    }
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
                        deposit: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Saldo</Label>
                  <Input value={formData.total - formData.deposit} disabled />
                </div>
              </div>

              {editingOrder && (
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={editingOrder.status}
                    onValueChange={(value) =>
                      setEditingOrder({ ...editingOrder, status: value as Order["status"] })
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
              {orders.map((order) => {
                const client = clients.find((c) => c.id === order.clientId);
                const service = services.find((s) => s.id === order.serviceId);
                return (
                  <TableRow key={order.id}>
                    <TableCell>{client?.name}</TableCell>
                    <TableCell>{service?.name}</TableCell>
                    <TableCell>Bs. {order.total.toFixed(2)}</TableCell>
                    <TableCell>Bs. {order.deposit.toFixed(2)}</TableCell>
                    <TableCell>Bs. {order.balance.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={getStatusStyle(order.status)}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingOrder(order);
                          const cli = clients.find((c) => c.id === order.clientId);
                          setFormData({
                            clientName: cli?.name || "",
                            clientPhone: cli?.phone || "",
                            serviceId: order.serviceId,
                            startDate: order.startDate,
                            expectedEndDate: order.expectedEndDate,
                            details: order.details,
                            deposit: order.deposit,
                            total: order.total,
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteOrder(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {orders.length === 0 && (
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
