import { OPENROUTER_API_KEY } from "@/lib/env";

export async function chat(messages:any[]) {
  const res = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method:"POST",
      headers:{
        Authorization:`Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"openai/gpt-4o-mini",
        messages
      })
    }
  );

  return res.json();
}