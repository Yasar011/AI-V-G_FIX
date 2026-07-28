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

export const saveLines = (lines: string[]) => set(ref(db, "config/lines"), lines);
export const saveFloors = (floors: string[]) => set(ref(db, "config/floors"), floors);
export const saveStyles = (styles: Style[]) => set(ref(db, "config/styles"), styles);
export const saveCategories = (categories: Categories) => set(ref(db, "config/categories"), categories);
