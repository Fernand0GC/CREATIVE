import type { FSDate } from "./fsdate";

export interface Order {
    id: string;
    clientId: string;    // referencia a Client
    serviceId: string;   // referencia a Service

    // Estas dos vienen de inputs <input type="date">, mantenlas como string (YYYY-MM-DD)
    startDate: string;
    expectedEndDate: string;

    details: string;
    deposit: number;     // suma de todos los payments
    total: number;
    balance: number;
    status: "pendiente" | "cancelado" | "completado";

    /** NUEVO: cantidad de unidades del servicio en la orden. */
    quantity?: number;   // opcional para compatibilidad con docs antiguos

    createdAt: FSDate;
    updatedAt?: FSDate;
}
