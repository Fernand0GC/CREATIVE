import type { FSDate } from "./fsdate";

export interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    createdAt: FSDate;
    updatedAt?: FSDate;
}
