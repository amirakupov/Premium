import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
    const body = await req.text();

    const backendRes = await fetch(`${BACKEND_URL}/api/cms/doctor`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            cookie: req.headers.get("cookie") ?? "",
        },
        body,
        cache: "no-store",
    });

    const data = await backendRes.json().catch(() => null);
    return NextResponse.json(data, { status: backendRes.status });
}