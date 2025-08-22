import type { FSDate } from "./fsdate";

export interface Client {
    id: string;
    name: string;
    phone: string;
    createdAt: FSDate;
    updatedAt?: FSDate;
}
