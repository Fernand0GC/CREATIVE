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
    orderBy
} from "firebase/firestore";
import { Order } from "@/types/order";

export const useOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const getOrders = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(data);
        } catch (error) {
            console.error("Error al obtener órdenes:", error);
        } finally {
            setLoading(false);
        }
    };

    const createOrder = async (orderData: Omit<Order, "id" | "createdAt">) => {
        const newDoc = await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: new Date().toISOString()
        });
        await getOrders();
        return newDoc.id;
    };

    const updateOrder = async (id: string, updates: Partial<Order>) => {
        await updateDoc(doc(db, "orders", id), {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        await getOrders();
    };

    const deleteOrder = async (id: string) => {
        await deleteDoc(doc(db, "orders", id));
        setOrders((prev) => prev.filter((o) => o.id !== id));
    };

    useEffect(() => {
        getOrders();
    }, []);

    return { orders, loading, getOrders, createOrder, updateOrder, deleteOrder };
};
