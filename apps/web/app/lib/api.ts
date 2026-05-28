export type ApiMessageResponse = string;

const DEFAULT_API_BASE_URL = "http://localhost:3001";

export async function fetchApiMessage(): Promise<ApiMessageResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const response = await fetch(baseUrl, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.text();
}
