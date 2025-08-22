import { useEffect, useMemo, useState, useCallback } from "react";
import { db } from "@/firebase";
import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where,
    Timestamp,
} from "firebase/firestore";

export type JournalType = "ingreso" | "egreso";

export interface JournalEntry {
    id?: string;
    type: JournalType;        // ingreso | egreso (¡solo estos dos!)
    amount: number;
    concept: string;
    date: Date | Timestamp;
    createdAt?: Date | Timestamp;
    // opcional
    notes?: string | null;
}

const _toDate = (v: any): Date | null =>
    v?.toDate?.() ?? (isNaN(new Date(v as any).getTime()) ? null : new Date(v));

export function useJournal() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const col = collection(db, "journal");
    const closuresCol = collection(db, "journal_days");

    /** ✅ SIN índices compuestos: 1 solo orderBy por "date"
     *  - Sin filtro: orderBy("date","desc")
     *  - Con rango: where(date>=) + where(date<=) + orderBy("date","desc")
     */
    const getEntries = useCallback(
        async (opts?: { from?: Date; to?: Date }) => {
            setLoading(true);
            try {
                let qRef = query(col, orderBy("date", "desc"));
                if (opts?.from && opts?.to) {
                    qRef = query(
                        col,
                        where("date", ">=", Timestamp.fromDate(opts.from)),
                        where("date", "<=", Timestamp.fromDate(opts.to)),
                        orderBy("date", "desc")
                    );
                }
                const snap = await getDocs(qRef);
                const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as JournalEntry[];
                setEntries(list);
            } catch (e) {
                console.error("Error getEntries(journal):", e);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const addEntry = useCallback(
        async (payload: Omit<JournalEntry, "id" | "createdAt">) => {
            try {
                await addDoc(col, {
                    ...payload,
                    amount: Number(payload.amount || 0),
                    date:
                        payload.date instanceof Date
                            ? Timestamp.fromDate(payload.date)
                            : payload.date ?? serverTimestamp(),
                    createdAt: serverTimestamp(),
                });
                await getEntries(); // refresca la lista
            } catch (e) {
                console.error("Error addEntry(journal):", e);
                throw e;
            }
        },
        [getEntries]
    );

    /** Cierre de día */
    const closeDay = useCallback(
        async (data: {
            date: Date;
            ingresos: Array<{ source: "payment" | "manual"; amount: number; concept: string; orderId?: string | null; orderName?: string | null; paymentId?: string | null; journalId?: string | null; }>;
            egresos: Array<{ amount: number; concept: string; journalId?: string | null; }>;
            totals: { ingresos: number; egresos: number; neto: number };
        }) => {
            try {
                await addDoc(closuresCol, {
                    date: Timestamp.fromDate(new Date(data.date.getFullYear(), data.date.getMonth(), data.date.getDate())),
                    ingresos: data.ingresos.map(i => ({ ...i, amount: Number(i.amount || 0) })),
                    egresos: data.egresos.map(e => ({ ...e, amount: Number(e.amount || 0) })),
                    totals: {
                        ingresos: Number(data.totals.ingresos || 0),
                        egresos: Number(data.totals.egresos || 0),
                        neto: Number(data.totals.neto || 0),
                    },
                    createdAt: serverTimestamp(),
                });
            } catch (e) {
                console.error("Error closeDay:", e);
                throw e;
            }
        },
        []
    );

    useEffect(() => {
        void getEntries();
    }, [getEntries]);

    const totals = useMemo(() => {
        let ingresos = 0, egresos = 0;
        for (const e of entries) {
            const n = Number((e as any).amount || 0);
            if (e.type === "egreso") egresos += n;
            else ingresos += n;
        }
        return { ingresos, egresos, neto: ingresos - egresos };
    }, [entries]);

    return { entries, loading, addEntry, getEntries, totals, _toDate, closeDay };
}

export default useJournal;
