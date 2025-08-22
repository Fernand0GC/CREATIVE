import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    serverTimestamp,
    query,                 // 👈 FALTABA ESTE IMPORT
} from "firebase/firestore";
import type { Service } from "@/types/service";
import { toDate } from "@/utils/toDate";

type ServiceWithDates = Service & {
    createdAtDate: Date | null;
    updatedAtDate?: Date | null;
};

export const useServices = () => {
    const [services, setServices] = useState<ServiceWithDates[]>([]);
    const [loading, setLoading] = useState(true);

    const servicesCol = collection(db, "services");

    const getServices = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(servicesCol, orderBy("createdAt", "desc")));
            const data = snap.docs.map((d) => {
                const raw = { id: d.id, ...(d.data() as any) } as Service;
                return {
                    ...raw,
                    createdAtDate: toDate(raw.createdAt),
                    updatedAtDate: toDate(raw.updatedAt),
                } as ServiceWithDates;
            });
            setServices(data);
        } catch (error) {
            console.error("Error al obtener servicios:", error);
        } finally {
            setLoading(false);
        }
    };

    const createService = async (serviceData: Omit<Service, "id" | "createdAt">) => {
        await addDoc(servicesCol, {
            ...serviceData,
            createdAt: serverTimestamp(),
        });
        await getServices();
    };

    const updateService = async (id: string, updates: Partial<Service>) => {
        await updateDoc(doc(servicesCol, id), {
            ...updates,
            updatedAt: serverTimestamp(),
        });
        await getServices();
    };

    const deleteService = async (id: string) => {
        await deleteDoc(doc(servicesCol, id));
        setServices((prev) => prev.filter((s) => s.id !== id));
    };

    useEffect(() => {
        void getServices();
    }, []);

    return { services, loading, getServices, createService, updateService, deleteService };
};

export default useServices;
