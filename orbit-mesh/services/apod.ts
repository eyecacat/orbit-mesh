export type ApodData = {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: "image" | "video";
  copyright?: string;
};

export async function fetchApod(apiKey: string): Promise<ApodData | null> {
  const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`);
  if (!res.ok) return null;
  return (await res.json()) as ApodData;
}