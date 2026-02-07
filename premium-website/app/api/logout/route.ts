import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
    res.headers.append("Set-Cookie", `access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure}`);

    return res;
}