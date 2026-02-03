import {NextRequest, NextResponse} from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;
export const POST = async (req: NextRequest)=> {
    const url = new URL(`${BACKEND_URL}/api/cms/login`);
    const body = await req.text();
    const responseBack = await fetch(url,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
            },
            body: body,
            cache: "no-store",
        })
    const data = await responseBack.json();
    const setCookie = responseBack.headers.get('set-cookie');
    const res = NextResponse.json(data, {
        status: responseBack.status,
    });
    if (setCookie) {
        res.headers.append("set-cookie", setCookie);
    }
    return res;
}