import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.GSI_DATABASE_URL;
const SESSION_COOKIE = "gsi_secure_session";

async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${API_BASE}/${path}`;

  // SECURE CHECK: Validate session cookie
  const sessionCookie = cookies().get(SESSION_COOKIE);
  if (!sessionCookie) {
    console.error("Unauthorized proxy access: No session found");
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  // Parse session to check roles
  let userSession;
  try {
    userSession = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { role } = userSession;

  // RBAC (Role-Based Access Control)
  // 1. Only admins can DELETE anything
  if (req.method === "DELETE" && role !== "admin") {
    console.warn(`Blocked DELETE attempt by non-admin user: ${userSession.userId}`);
    return NextResponse.json({ error: "Admin privilege required for deletion" }, { status: 403 });
  }

  // 2. Only admins or authorized staff can access the database
  if (!["admin", "comptable", "agent"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
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
    let data = await res.json();

    // 3. Data isolation by Etablissement (for non-admins)
    if (req.method === "GET" && role !== "admin") {
      const collection = params.path[0];
      const myEtab = userSession.etablissement;

      // Helper to check if a record belongs to the user's establishment
      const belongsToMe = (item: any) => {
        const campus = (item.campus || "").toLowerCase();
        return campus.includes(myEtab) || campus.includes(myEtab.slice(0, 4));
      };

      if (["users", "ecolage", "paiements"].includes(collection)) {
        // We need to find where the array is in the response (data.documents, etc.)
        let listKey = "";
        for (const key of ["documents", "data", "results", "items", "records", "list"]) {
          if (Array.isArray(data[key])) { listKey = key; break; }
        }

        if (listKey) {
          data[listKey] = data[listKey].filter(belongsToMe);
        } else if (Array.isArray(data)) {
          data = data.filter(belongsToMe);
        }
      }
    }

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
