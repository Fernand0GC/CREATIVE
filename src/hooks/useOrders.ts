import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";
import type { Order } from "@/types/order";

export const useOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const ordersCol = collection(db, "orders");

    const getOrders = async () => {
        setLoading(true);
        try {
            // Asegúrate de que todos los docs tengan createdAt para poder ordenar
            const q = query(ordersCol, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
            })) as Order[];
            setOrders(data);
        } catch (error) {
            console.error("Error al obtener órdenes:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Crea una orden con createdAt=serverTimestamp().
     * Devuelve el ID del documento creado.
     */
    const createOrder = async (orderData: Omit<Order, "id" | "createdAt">) => {
        const newRef = await addDoc(ordersCol, {
            ...orderData,
            createdAt: serverTimestamp(),
        });
        await getOrders();
        return newRef.id;
    };

    /**
     * Actualiza una orden e inyecta updatedAt=serverTimestamp().
     */
    const updateOrder = async (id: string, updates: Partial<Order>) => {
        await updateDoc(doc(ordersCol, id), {
            ...updates,
            updatedAt: serverTimestamp(),
        });
        await getOrders();
    };

    /**
     * Elimina una orden localmente tras borrar en Firestore.
     */
    const deleteOrder = async (id: string) => {
        await deleteDoc(doc(ordersCol, id));
        setOrders((prev) => prev.filter((o) => o.id !== id));
    };

    useEffect(() => {
        void getOrders();
    }, []);

    return { orders, loading, getOrders, createOrder, updateOrder, deleteOrder };
};

export default useOrders;
