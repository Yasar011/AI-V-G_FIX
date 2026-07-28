"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { getSession } from "@/lib/auth";
import type { InspectionRecord } from "@/lib/types";

/**
 * Live inspection records, newest first.
 *
 * Non-admin users only see their own line's pieces: a Supervisor assigned
 * to "Line 2" gets Line 2 records only. Admins (and users with no line
 * assigned) see everything.
 */
export function useInspections() {
  const [records, setRecords] = useState<InspectionRecord[] | null>(null);

  useEffect(() => {
    const session = getSession();
    const scopedLine = session && session.role !== "Admin" ? session.line : null;

    const inspectionsRef = ref(db, "inspections");
    const unsubscribe = onValue(inspectionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      let list = Object.values(data) as InspectionRecord[];
      if (scopedLine) {
        list = list.filter((r) => r.line === scopedLine);
      }
      list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      setRecords(list);
    });
    return () => unsubscribe();
  }, []);

  return records;
}
