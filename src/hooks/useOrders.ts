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
    runTransaction,
} from "firebase/firestore";
import type { Order } from "@/types/order";
import { getOrCreateServiceByName } from "@/hooks/useServices";

/**
 * Entrada alternativa para crear orden con “resolución de servicio”.
 * - Puedes pasar serviceId (existente) O serviceName (texto libre).
 * - Si llega serviceName y no existe, se crea automáticamente el Servicio.
 */
export type CreateOrderWithServiceInput = Omit<
    Order,
    "id" | "createdAt" | "updatedAt" | "serviceId"
> & {
    serviceId?: string;
    serviceName?: string;
    /** Si manejas cantidad en la orden pero tu tipo lo tiene opcional, respalda con 1. */
    quantity?: number;
};

export const useOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const ordersCol = collection(db, "orders");

    const getOrders = async () => {
        setLoading(true);
        try {
            const q = query(ordersCol, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((d) => {
                const raw = { id: d.id, ...(d.data() as any) } as Order & { quantity?: number };
                // Compatibilidad: si no hay quantity, usa 1
                if (raw.quantity === undefined || raw.quantity === null) {
                    (raw as any).quantity = 1;
                }
                return raw as Order;
            });
            setOrders(data);
        } catch (error) {
            console.error("Error al obtener órdenes:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * API existente: crea una orden con createdAt=serverTimestamp().
     * Devuelve el ID del documento creado.
     */
    const createOrder = async (orderData: Omit<Order, "id" | "createdAt">) => {
        const payload = {
            ...orderData,
            // por si tu UI manda quantity opcional
            quantity: (orderData as any).quantity ?? 1,
            createdAt: serverTimestamp(),
        };
        const newRef = await addDoc(ordersCol, payload);
        await getOrders();
        return newRef.id;
    };

    /**
     * NUEVO: Crea una orden resolviendo el servicio por nombre si no existe.
     * - Valida mínimos (clientId, total>=0, deposit>=0, deposit<=total).
     * - Calcula balance si no lo pasas.
     * - Usa transacción para asegurar consistencia.
     */
    const createOrderWithServiceResolution = async (input: CreateOrderWithServiceInput) => {
        const {
            clientId,
            serviceId,
            serviceName,
            startDate,
            expectedEndDate,
            details,
            total,
            deposit = 0,
            balance,
            status = "pendiente",
            quantity = 1,
        } = input;

        if (!clientId) throw new Error("Falta clientId.");
        if (!serviceId && !serviceName) throw new Error("Debes pasar serviceId o serviceName.");
        if (quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");
        if (total < 0) throw new Error("El total no puede ser negativo.");
        if (deposit < 0) throw new Error("El abono no puede ser negativo.");
        if (deposit > total) throw new Error("El abono no puede exceder el total.");

        const balanceToSave =
            typeof balance === "number" ? balance : Math.max(0, Number(total) - Number(deposit));

        const newOrderId = await runTransaction(db, async (tx) => {
            let serviceIdToUse = serviceId || "";

            if (!serviceIdToUse) {
                const unitPrice = quantity ? Number(total) / Number(quantity) : null;
                const { id } = await getOrCreateServiceByName(serviceName!, {
                    defaultPrice: unitPrice,
                });
                serviceIdToUse = id;
            }

            const newRef = doc(ordersCol);
            tx.set(newRef, {
                clientId,
                serviceId: serviceIdToUse,
                startDate: startDate || "",
                expectedEndDate: expectedEndDate || "",
                details: details || "",
                total: Number(total) || 0,
                deposit: Number(deposit) || 0,
                balance: Number(balanceToSave) || 0,
                status,
                quantity: Number(quantity) || 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return newRef.id;
        });

        await getOrders();
        return newOrderId;
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

    return {
        orders,
        loading,
        getOrders,
        createOrder, // API existente
        createOrderWithServiceResolution, // NUEVO para servicio libre/auto-creado
        updateOrder,
        deleteOrder,
    };
};

export default useOrders;
