export interface Client {
    id: string;
    name: string;
    phone: string;
    createdAt: string; // ISO date
    updatedAt?: string; // ISO date opcional
}
