import {
  BHLoginResponse,
  BHSearchResponse,
  BHCypherResponse,
  BHDomainResponse,
  BHNodeEntityResponse,
} from "./types";

const BH_URL = process.env.BH_URL || "http://127.0.0.1:8080";
const BH_USERNAME = process.env.BH_USERNAME || "admin";
const BH_PASSWORD = process.env.BH_PASSWORD || "";

let cachedToken: string | null = null;
let tokenExpiry = 0;
let loginPromise: Promise<string> | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Deduplicate concurrent login requests
  if (loginPromise) return loginPromise;

  loginPromise = (async () => {
    try {
      for (let attempt = 0; attempt <= 3; attempt++) {
        const res = await fetch(`${BH_URL}/api/v2/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login_method: "secret",
            secret: BH_PASSWORD,
            username: BH_USERNAME,
          }),
        });

        if (res.status === 429 && attempt < 3) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }

        if (!res.ok) {
          throw new Error(`BH login failed: ${res.status} ${res.statusText}`);
        }

        const json = (await res.json()) as { data: BHLoginResponse };
        cachedToken = json.data.session_token;
        tokenExpiry = Date.now() + 55 * 60 * 1000;
        return cachedToken;
      }
      throw new Error("BH login: max retries exceeded");
    } finally {
      loginPromise = null;
    }
  })();

  return loginPromise;
}

export async function bhFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const url = `${BH_URL}${path}`;

  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (res.status === 429 && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`BH API error ${res.status}: ${path} — ${text}`);
    }

    return res.json() as Promise<T>;
  }

  throw new Error(`BH API: max retries exceeded for ${path}`);
}

export async function searchNodes(query: string, limit = 10) {
  const data = await bhFetch<BHSearchResponse>(
    `/api/v2/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return data.data;
}

export async function getNodeByObjectId(objectId: string) {
  // BH CE uses the /api/v2/base/{objectid} endpoint
  const data = await bhFetch<BHNodeEntityResponse>(
    `/api/v2/base/${encodeURIComponent(objectId)}`
  );
  return data.data;
}

export async function runCypher(
  query: string,
  includeProperties = true
): Promise<BHCypherResponse["data"]> {
  const data = await bhFetch<{ data: BHCypherResponse["data"] }>(
    "/api/v2/graphs/cypher",
    {
      method: "POST",
      body: JSON.stringify({ query, include_properties: includeProperties }),
    }
  );
  return data.data;
}

export async function getDomains() {
  const data = await bhFetch<BHDomainResponse>("/api/v2/available-domains");
  return data.data;
}

export async function getShortestPath(
  startNode: string,
  endNode: string
) {
  // Use Cypher for pathfinding — more reliable than the pathfinding API
  const query = `MATCH p=shortestPath((s)-[*1..]->(e)) WHERE s.objectid = "${startNode}" AND e.objectid = "${endNode}" RETURN p`;
  return runCypher(query);
}
