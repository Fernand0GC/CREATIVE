export interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    createdAt: string; // ISO date
    updatedAt?: string; // ISO date opcional
}
