export interface Payment {
    id: string;
    orderId: string; // referencia a Order
    amount: number;
    date: string; // ISO date del pago
    paymentMethod: "efectivo" | "transferencia" | "qr";
    notes?: string;
    createdAt: string; // ISO date
}
