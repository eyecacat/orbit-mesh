import { NASA_API_KEY } from "@/lib/env";

const BASE = "https://api.nasa.gov/DONKI";

export async function getSolarFlares(start: string,end: string){
  const res = await fetch(
    `${BASE}/FLR?startDate=${start}&endDate=${end}&api_key=${NASA_API_KEY}`
  );

  return res.json();
}