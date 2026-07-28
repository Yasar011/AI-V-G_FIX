import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";

export interface Style {
  name: string;
  category: string;
}

/** category -> ordered views the operator captures, e.g. shorts -> [Front, Side, Back] */
export type Categories = Record<string, string[]>;

async function readList(key: string): Promise<string[]> {
  const snap = await get(ref(db, `config/${key}`));
  const value = snap.val();
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

export const getLines = () => readList("lines");
export const getFloors = () => readList("floors");

export async function getStyles(): Promise<Style[]> {
  const snap = await get(ref(db, "config/styles"));
  const value = snap.val();
  if (!value) return [];
  const list = Array.isArray(value) ? value : Object.values(value);
  return list as Style[];
}

export async function getCategories(): Promise<Categories> {
  const snap = await get(ref(db, "config/categories"));
  return (snap.val() || {}) as Categories;
}

/** One entry from the factory's real defect taxonomy (S1, F3, D2 ...). */
export interface DefectCode {
  code: string;
  name: string;
  category: string;
  verdict: "reject" | "rework" | "check";
  action: string;
}

export async function getDefectCatalog(): Promise<DefectCode[]> {
  const snap = await get(ref(db, "config/defectCatalog"));
  const value = snap.val() || {};
  return (Object.values(value) as DefectCode[]).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    // S2 before S10 - numeric part, not string order
    const na = parseInt(a.code.slice(1), 10);
    const nb = parseInt(b.code.slice(1), 10);
    return na - nb;
  });
}

/** Which catalogue code an AI class maps onto, so the reviewer starts
 *  from the model's best guess instead of a blank field. */
export async function getAiClassToCode(): Promise<Record<string, string>> {
  const snap = await get(ref(db, "config/aiClassToCode"));
  return (snap.val() || {}) as Record<string, string>;
}

export const saveLines = (lines: string[]) => set(ref(db, "config/lines"), lines);
export const saveFloors = (floors: string[]) => set(ref(db, "config/floors"), floors);
export const saveStyles = (styles: Style[]) => set(ref(db, "config/styles"), styles);
export const saveCategories = (categories: Categories) => set(ref(db, "config/categories"), categories);
