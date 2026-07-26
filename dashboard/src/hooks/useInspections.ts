"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import type { InspectionRecord } from "@/lib/types";

export function useInspections() {
  const [records, setRecords] = useState<InspectionRecord[] | null>(null);

  useEffect(() => {
    const inspectionsRef = ref(db, "inspections");
    const unsubscribe = onValue(inspectionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.values(data) as InspectionRecord[];
      list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      setRecords(list);
    });
    return () => unsubscribe();
  }, []);

  return records;
}
