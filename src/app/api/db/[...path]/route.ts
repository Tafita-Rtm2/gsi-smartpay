import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = "https://groupegsi.mg/rtmggmg/api/db";
const SESSION_COOKIE = "gsi_secure_session";

async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${API_BASE}/${path}`;

  // SECURE CHECK: Validate session cookie
  const session = cookies().get(SESSION_COOKIE);
  if (!session) {
    console.error("Unauthorized proxy access: No session found");
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

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
