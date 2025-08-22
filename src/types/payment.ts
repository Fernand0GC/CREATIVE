import type { FSDate } from "./fsdate";

export interface Payment {
    id: string;
    orderId: string; // referencia a Order
    amount: number;
    /** Fecha efectiva del pago (para diario, reportes, filtros) */
    date: FSDate;
    paymentMethod: "efectivo" | "transferencia" | "qr";
    notes?: string;
    /** Marca técnica de creación en la BD (puede coincidir con date) */
    createdAt: FSDate;
}
