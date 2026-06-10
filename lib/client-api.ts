// Tiny typed fetch wrappers for the client. Throw on non-2xx with the
// server's error message so React Query / toasts can surface it.

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Erreur réseau");
  }
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>(await fetch(url));
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}
