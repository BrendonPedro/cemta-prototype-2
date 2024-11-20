export async function fetchWithError(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API call failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }
    return response.json();
  }