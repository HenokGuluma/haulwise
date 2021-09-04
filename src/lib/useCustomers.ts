"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Customer } from "@/types";

/**
 * Full customer list for dropdowns that need every customer, not a paginated
 * page of them (e.g. the New Load modal). Fetched on demand — only mounted
 * where actually needed — rather than every page eagerly loading the whole
 * customer table up front.
 *
 * `enabled` (default true) lets a caller that already has the list from
 * elsewhere skip the request entirely instead of duplicating it.
 */
export function useCustomers(enabled: boolean = true): Customer[] {
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    if (!enabled) return;
    api.get<{ rows: Customer[] }>("/api/customers?pageSize=500&sortBy=companyName&sortDir=asc").then((res) => setCustomers(res.rows)).catch(() => {});
  }, [enabled]);
  return customers;
}
