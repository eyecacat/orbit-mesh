import { BACKEND_URL } from "@/lib/env";

export async function getSolarFlares(start: string, end: string) {
  const res = await fetch(
    `${BACKEND_URL}/api/nasa?startDate=${start}&endDate=${end}`
  );

  return res.json();
}