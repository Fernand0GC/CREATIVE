// src/utils/toDate.ts
export const toDate = (v: any): Date | null => {
    if (!v) return null;
    if (typeof v === "object" && typeof v.seconds === "number") {
        return new Date(v.seconds * 1000);
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};
