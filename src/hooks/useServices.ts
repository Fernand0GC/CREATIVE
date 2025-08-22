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
    query,
    where,
    limit,
    DocumentReference,
} from "firebase/firestore";
import type { Service } from "@/types/service";
import { toDate } from "@/utils/toDate";

type ServiceWithDates = Service & {
    createdAtDate: Date | null;
    updatedAtDate?: Date | null;
};

/** Normaliza nombre para evitar duplicados por mayúsculas/acentos/espacios */
export const normalizeName = (name: string): string =>
    (name || "")
        .trim()
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

/**
 * Busca un servicio por nombre normalizado y, si no existe, lo crea.
 * Devuelve { ref, id, name } del servicio definitivo.
 */
export async function getOrCreateServiceByName(
    rawName: string,
    opts?: { defaultPrice?: number | null; extra?: Partial<Service> }
): Promise<{ ref: DocumentReference; id: string; name: string }> {
    const servicesCol = collection(db, "services");
    const name = (rawName || "").trim();
    if (!name) throw new Error("El nombre del servicio está vacío.");

    const norm = normalizeName(name);

    // Buscar coincidencia exacta por nombre normalizado
    const q = query(servicesCol, where("normalizedName", "==", norm), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data() as any;
        return { ref: docSnap.ref, id: docSnap.id, name: data?.name || name };
    }

    // Crear nuevo servicio
    const docRef = await addDoc(servicesCol, {
        name,
        normalizedName: norm,
        price: typeof opts?.defaultPrice === "number" ? opts.defaultPrice : null,
        active: true,
        ...opts?.extra,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return { ref: docRef, id: docRef.id, name };
}

export const useServices = () => {
    const [services, setServices] = useState<ServiceWithDates[]>([]);
    const [loading, setLoading] = useState(true);

    const servicesCol = collection(db, "services");

    const getServices = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(servicesCol, orderBy("createdAt", "desc")));
            const data = snap.docs.map((d) => {
                const raw = { id: d.id, ...(d.data() as any) } as Service & { normalizedName?: string };
                return {
                    ...raw,
                    createdAtDate: toDate((raw as any).createdAt),
                    updatedAtDate: toDate((raw as any).updatedAt),
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
        const name = (serviceData.name || "").trim();
        await addDoc(servicesCol, {
            ...serviceData,
            name,
            normalizedName: normalizeName(name),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        await getServices();
    };

    const updateService = async (id: string, updates: Partial<Service>) => {
        const patch: Record<string, any> = { ...updates, updatedAt: serverTimestamp() };
        if (typeof updates.name === "string") {
            patch.name = updates.name.trim();
            patch.normalizedName = normalizeName(updates.name);
        }
        await updateDoc(doc(servicesCol, id), patch);
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
