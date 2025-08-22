import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";
import type { Client } from "@/types/client";
import { toDate } from "@/utils/toDate";

type ClientWithDates = Client & {
    createdAtDate: Date | null;
    updatedAtDate?: Date | null;
};

export const useClients = () => {
    const [clients, setClients] = useState<ClientWithDates[]>([]);
    const [loading, setLoading] = useState(true);

    const clientsCol = collection(db, "clients");

    const getClients = async () => {
        setLoading(true);
        try {
            // Ordenamos por createdAt para vistas más consistentes
            const snap = await getDocs(query(clientsCol, orderBy("createdAt", "desc")));
            const data = snap.docs.map((d) => {
                const raw = { id: d.id, ...(d.data() as any) } as Client;
                return {
                    ...raw,
                    createdAtDate: toDate(raw.createdAt),
                    updatedAtDate: toDate(raw.updatedAt),
                } as ClientWithDates;
            });
            setClients(data);
        } catch (error) {
            console.error("Error al obtener clientes:", error);
        } finally {
            setLoading(false);
        }
    };

    const createClient = async (clientData: Omit<Client, "id" | "createdAt">) => {
        const docRef = await addDoc(clientsCol, {
            ...clientData,
            createdAt: serverTimestamp(),   // ✅ unificado a Timestamp
        });
        await getClients();
        return docRef.id;
    };

    const findClientByPhone = async (phone: string) => {
        const q = query(clientsCol, where("phone", "==", phone));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const d = snapshot.docs[0];
        const raw = { id: d.id, ...(d.data() as any) } as Client;
        const normalized: ClientWithDates = {
            ...raw,
            createdAtDate: toDate(raw.createdAt),
            updatedAtDate: toDate(raw.updatedAt),
        };
        return normalized;
    };

    useEffect(() => {
        void getClients();
    }, []);

    return { clients, loading, getClients, createClient, findClientByPhone };
};

export default useClients;
