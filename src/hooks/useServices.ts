import { useEffect, useState, useCallback } from "react";
import { db } from "@/firebase";
import {
    addDoc,
    collection,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";

/** Ajusta este tipo si tu schema tiene más campos */
export type Service = {
    id: string;
    name: string;
    price?: number | null;
    createdAt?: any;
};

/**
 * Busca por nombre exacto y si no existe, lo crea.
 * Si quieres case-insensitive, podemos guardar también nameLower y consultar por ahí.
 */
export async function getOrCreateServiceByName(
    name: string,
    opts?: { defaultPrice?: number | null }
): Promise<{ id: string; created: boolean }> {
    const col = collection(db, "services");
    const q = query(col, where("name", "==", name));
    const snap = await getDocs(q);

    if (!snap.empty) {
        return { id: snap.docs[0].id, created: false };
    }

    const ref = await addDoc(col, {
        name,
        price: opts?.defaultPrice ?? null,
        createdAt: serverTimestamp(),
    });

    return { id: ref.id, created: true };
}

export function useServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const col = collection(db, "services");

    /** Carga puntual (ya no imprescindible si usas onSnapshot) */
    const getServices = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(col, orderBy("name", "asc")));
            setServices(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        } catch (e) {
            console.error("getServices error:", e);
        } finally {
            setLoading(false);
        }
    }, [col]);

    /** ✅ Suscripción en tiempo real: la columna “Trabajo” se actualiza al instante. */
    useEffect(() => {
        const qy = query(col, orderBy("name", "asc"));
        const unsub = onSnapshot(
            qy,
            (snap) => {
                setServices(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
                setLoading(false);
            },
            (err) => {
                console.error("onSnapshot(services) error:", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [col]);

    /** Crear servicio directo (opcional) */
    const createService = useCallback(
        async (name: string, price?: number | null) => {
            const ref = await addDoc(col, {
                name,
                price: price ?? null,
                createdAt: serverTimestamp(),
            });
            return ref.id;
        },
        [col]
    );

    return { services, loading, getServices, createService };
}

export default useServices;
