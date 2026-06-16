import { formatApiError } from "@/lib/utils";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function parseJsonResponse<T = unknown>(
  response: Response
): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      response.ok
        ? "Server returned an invalid response."
        : `Request failed (${response.status}).`,
      response.status
    );
  }
}

export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ response: Response; data: T | null }> {
  const response = await fetch(input, init);
  const data = await parseJsonResponse<T>(response);
  return { response, data };
}

export async function fetchApi<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const { response, data } = await fetchJson<T>(input, init);

  if (!response.ok) {
    const payload = data as { error?: unknown } | null;
    throw new ApiError(
      formatApiError(payload?.error) ?? `Request failed (${response.status})`,
      response.status
    );
  }

  return data as T;
}
