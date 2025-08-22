// Acepta Firestore Timestamp (objeto con seconds/nanoseconds) o string ISO
export type FSDate = string | { seconds: number; nanoseconds: number };
