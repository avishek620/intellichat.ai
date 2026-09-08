export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function performWebSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: "advanced",
      }),
    });

    if (!res.ok) {
      console.error("Tavily search failed:", res.status, await res.text());
      return [];
    }

    const data = await res.json();

    return (data.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
    }));
  } catch (err) {
    console.error("Web search error:", err);
    return [];
  }
}