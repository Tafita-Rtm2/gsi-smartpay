import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "gsi_secure_session";

export async function POST(req: NextRequest) {
  const { user } = await req.json();

  if (!user || !user.id) {
    return NextResponse.json({ error: "Invalid user data" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  // Set an HTTP-only cookie for security (cannot be accessed by JS)
  cookies().set(SESSION_COOKIE, JSON.stringify({
    userId: user.id,
    role: user.role,
    etablissement: user.etablissement
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 1 day
    path: "/",
  });

  return response;
}

export async function GET() {
  const session = cookies().get(SESSION_COOKIE);
  if (!session) return NextResponse.json({ authenticated: false });

  try {
    return NextResponse.json({
      authenticated: true,
      user: JSON.parse(session.value)
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
