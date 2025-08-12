export interface Order {
    id: string;
    clientId: string; // referencia a Client
    serviceId: string; // referencia a Service
    startDate: string; // ISO date
    expectedEndDate: string; // ISO date
    details: string;
    deposit: number;
    total: number;
    balance: number;
    status: "pendiente" | "cancelado" | "completado";
    createdAt: string; // ISO date
    updatedAt?: string; // ISO date opcional
}
