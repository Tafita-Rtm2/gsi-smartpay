import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://groupegsi.mg/rtmggmg/api/db";

// Internal secret to ensure only our frontend calls this proxy
const INTERNAL_SECRET = "GSI_INTERNAL_PROTECTION_2025";

async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${API_BASE}/${path}`;

  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  // Check if it's an internal request
  const secret = req.headers.get("x-gsi-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    console.error("Unauthorized proxy access attempt");
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const options: RequestInit = {
    method: req.method,
    headers,
  };

  if (["POST", "PATCH", "PUT"].includes(req.method)) {
    const body = await req.json();
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch from upstream" }, { status: 500 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const PUT = proxyRequest;
