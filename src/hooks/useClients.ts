import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "firebase/firestore";
import { Client } from "@/types/client";

export const useClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const getClients = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "clients"));
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })) as Client[];
            setClients(data);
        } catch (error) {
            console.error("Error al obtener clientes:", error);
        } finally {
            setLoading(false);
        }
    };

    const createClient = async (clientData: Omit<Client, "id" | "createdAt">) => {
        const docRef = await addDoc(collection(db, "clients"), {
            ...clientData,
            createdAt: new Date().toISOString()
        });
        await getClients();
        return docRef.id;
    };

    const findClientByPhone = async (phone: string) => {
        const q = query(collection(db, "clients"), where("phone", "==", phone));
        const snapshot = await getDocs(q);
        return snapshot.empty
            ? null
            : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client);
    };

    useEffect(() => {
        getClients();
    }, []);

    return { clients, loading, getClients, createClient, findClientByPhone };
};
