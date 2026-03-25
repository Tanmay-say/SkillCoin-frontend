import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/index";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const proto =
    (req.headers["x-forwarded-proto"] as string) || "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    req.headers.host ||
    "localhost";
  const url = `${proto}://${host}${req.url || "/"}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value))
      value.forEach((v) => headers.append(key, v));
  }

  let body: Buffer | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }

  const init: RequestInit = { method: req.method || "GET", headers };
  if (body) {
    init.body = body;
    // @ts-ignore duplex required for request bodies in Node.js
    init.duplex = "half";
  }

  const webRes = await app.fetch(new Request(url, init));

  res.statusCode = webRes.status;
  webRes.headers.forEach((v, k) => res.setHeader(k, v));

  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}
