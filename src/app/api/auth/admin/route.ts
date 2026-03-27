import { NextRequest, NextResponse } from "next/server";

// This is kept only on the server, never sent to the browser
const ADMIN_PASSWORD = "Nina GSI";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === ADMIN_PASSWORD) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Mot de passe incorrect" }, { status: 401 });
}
