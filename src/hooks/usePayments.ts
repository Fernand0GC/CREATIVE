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
    where,
    runTransaction,
    serverTimestamp,
    getDoc,
} from "firebase/firestore";
import { Payment } from "@/types/payment";
import { Order } from "@/types/order";

export const usePayments = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const paymentsCol = collection(db, "payments");
    const ordersCol = collection(db, "orders");

    const getPayments = async () => {
        setLoading(true);
        try {
            const q = query(paymentsCol, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((d) => {
                const payload = d.data() as any;
                return {
                    id: d.id,
                    ...payload,
                } as Payment;
            });
            setPayments(data);
        } catch (error) {
            console.error("Error al obtener pagos:", error);
        } finally {
            setLoading(false);
        }
    };

    const getPendingPayments = async () => {
        const q = query(ordersCol, where("balance", ">", 0));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
    };

    /**
     * Registra un pago y actualiza la orden en una sola transacción.
     * - Suma amount a deposit
     * - Recalcula balance = total - deposit
     * - Cambia status a "completado" si balance llega a 0
     * Retorna el ID del pago creado.
     */
    const registerPayment = async (
        orderId: string,
        amount: number,
        method: Payment["paymentMethod"],
        notes?: string
    ) => {
        if (!orderId) throw new Error("Falta orderId");
        if (!(amount > 0)) throw new Error("El monto debe ser mayor a 0");

        const paymentId = await runTransaction(db, async (tx) => {
            const orderRef = doc(ordersCol, orderId);
            const orderSnap = await tx.get(orderRef);
            if (!orderSnap.exists()) throw new Error("Orden no encontrada");

            const order = orderSnap.data() as Order;

            const total = Number(order.total ?? 0);
            const currentDeposit = Number(order.deposit ?? 0);
            const newDeposit = currentDeposit + Number(amount);
            const newBalance = Math.max(0, total - newDeposit);
            const newStatus: Order["status"] =
                newBalance === 0 ? "completado" : "pendiente";

            // 1) crear pago (con date)
            const payRef = doc(paymentsCol); // id autogenerado
            tx.set(payRef, {
                id: payRef.id,
                orderId,
                amount: Number(amount),
                paymentMethod: method,
                notes: notes ?? "",
                date: serverTimestamp(),       // 👈 NUEVO: fecha del pago
                createdAt: serverTimestamp(),  // marca de creación técnica
            });

            // 2) actualizar orden
            tx.update(orderRef, {
                deposit: newDeposit,
                balance: newBalance,
                status: newStatus,
                updatedAt: serverTimestamp(),
            });

            return payRef.id;
        });

        await getPayments();
        return paymentId;
    };

    /**
     * Solo crea el documento de pago, NO toca la orden.
     * También guarda date.
     */
    const registerPaymentOnly = async (
        orderId: string,
        amount: number,
        method: Payment["paymentMethod"],
        notes?: string
    ) => {
        if (!orderId) throw new Error("Falta orderId");
        if (!(amount > 0)) throw new Error("El monto debe ser mayor a 0");

        const ref = await addDoc(paymentsCol, {
            orderId,
            amount: Number(amount),
            paymentMethod: method,
            notes: notes ?? "",
            date: serverTimestamp(),       // 👈 NUEVO
            createdAt: serverTimestamp(),
        });

        await getPayments();
        return ref.id;
    };

    /**
     * Recalcula el balance de una orden, por si necesitas
     * sincronizar manualmente luego de imports/bulk ops.
     */
    const recalcOrderFromPayments = async (orderId: string) => {
        const orderRef = doc(ordersCol, orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) throw new Error("Orden no encontrada");

        const q = query(paymentsCol, where("orderId", "==", orderId));
        const snap = await getDocs(q);
        const sum = snap.docs.reduce(
            (acc, d) => acc + Number((d.data() as any).amount ?? 0),
            0
        );

        const order = orderSnap.data() as Order;
        const total = Number(order.total ?? 0);
        const deposit = sum;
        const balance = Math.max(0, total - deposit);
        const status: Order["status"] = balance === 0 ? "completado" : "pendiente";

        await updateDoc(orderRef, {
            deposit,
            balance,
            status,
            updatedAt: serverTimestamp(),
        });
    };

    useEffect(() => {
        void getPayments();
    }, []);

    return {
        payments,
        loading,
        getPayments,
        getPendingPayments,
        registerPayment,
        registerPaymentOnly,
        recalcOrderFromPayments,
    };
};
export default usePayments;
