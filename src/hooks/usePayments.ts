import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    where
} from "firebase/firestore";
import { Payment } from "@/types/payment";
import { Order } from "@/types/order";

export const usePayments = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const getPayments = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })) as Payment[];
            setPayments(data);
        } catch (error) {
            console.error("Error al obtener pagos:", error);
        } finally {
            setLoading(false);
        }
    };

    const getPendingPayments = async () => {
        const q = query(collection(db, "orders"), where("balance", ">", 0));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        })) as Order[];
    };

    const registerPayment = async (
        orderId: string,
        amount: number,
        method: Payment["paymentMethod"],
        notes?: string
    ) => {
        const paymentData = {
            orderId,
            amount,
            date: new Date().toISOString(),
            paymentMethod: method,
            notes,
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, "payments"), paymentData);

        // Actualizar balance de la orden
        const orderRef = doc(db, "orders", orderId);
        // Lo ideal sería leer el balance actual antes de restar
        const orderSnapshot = await getDocs(query(collection(db, "orders"), where("__name__", "==", orderId)));
        const currentOrder = orderSnapshot.docs[0]?.data() as Order;

        if (currentOrder) {
            const newBalance = currentOrder.balance - amount;
            await updateDoc(orderRef, {
                balance: newBalance,
                status: newBalance <= 0 ? "completado" : "pendiente"
            });
        }

        await getPayments();
    };

    useEffect(() => {
        getPayments();
    }, []);

    return { payments, loading, getPayments, getPendingPayments, registerPayment };
};
