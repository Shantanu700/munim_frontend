import { client } from "@/src/client/client.gen";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:8000";

client.setConfig({ baseUrl: API_BASE, credentials: "include" });

export { client };

export function basicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

function messages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(messages);
  if (value && typeof value === "object") return Object.values(value).flatMap(messages);
  return [];
}

export function describeApiError(error: unknown): string {
  if (error && typeof error === "object") {
    const found = messages("msg" in error ? error.msg : "detail" in error ? error.detail : error);
    if (found.length) return found.join(" ");
  }
  return "Something went wrong. Please try again.";
}
