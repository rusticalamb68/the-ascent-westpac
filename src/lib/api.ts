export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function post<T = Record<string, unknown>>(action: string, body: unknown = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}
