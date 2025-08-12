import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useServices } from "@/hooks/useServices";
import { Service } from "@/types/service";

export default function ServicesPage() {
  const { services, loading, createService, updateService, deleteService } =
    useServices();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", price: 0 });
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingService) {
      await updateService(editingService.id, {
        name: formData.name,
        description: formData.description,
        price: formData.price,
      });
    } else {
      await createService({
        name: formData.name,
        description: formData.description,
        price: formData.price,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Servicios</h1>
          <p className="text-muted-foreground">
            Gestiona el catálogo de servicios que ofreces.
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Editar servicio" : "Crear servicio"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label>Descripción</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label>Precio</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  required
                  min={0}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingService ? "Actualizar" : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-lg border shadow-soft">
        {loading ? (
          <div className="p-8 text-center">Cargando servicios...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length > 0 ? (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.description}</TableCell>
                    <TableCell>Bs. {service.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(service.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingService(service);
                          setFormData({
                            name: service.name,
                            description: service.description,
                            price: service.price,
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteService(service.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No hay servicios registrados
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
