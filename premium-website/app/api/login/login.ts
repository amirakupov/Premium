import {LoginRequest} from "@/app/api/interaface/LoginRequest";

export const login = async (payload: LoginRequest) => {

    const url = `/api/login`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    if (!response.ok) {
        const txt = await response.text().catch(() => "");
        console.error("Failed login", response.status, txt);
        return false;
    }
    return true;
};
