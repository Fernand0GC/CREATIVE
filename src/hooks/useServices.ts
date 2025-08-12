import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "firebase/firestore";
import { Service } from "@/types/service";

export const useServices = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const getServices = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "services"));
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })) as Service[];
            setServices(data);
        } catch (error) {
            console.error("Error al obtener servicios:", error);
        } finally {
            setLoading(false);
        }
    };

    const createService = async (serviceData: Omit<Service, "id" | "createdAt">) => {
        await addDoc(collection(db, "services"), {
            ...serviceData,
            createdAt: new Date().toISOString()
        });
        await getServices();
    };

    const updateService = async (id: string, updates: Partial<Service>) => {
        await updateDoc(doc(db, "services", id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        await getServices();
    };

    const deleteService = async (id: string) => {
        await deleteDoc(doc(db, "services", id));
        setServices((prev) => prev.filter((s) => s.id !== id));
    };

    useEffect(() => {
        getServices();
    }, []);

    return { services, loading, getServices, createService, updateService, deleteService };
};
