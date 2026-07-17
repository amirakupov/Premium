import type { Metadata } from "next";
import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export const metadata: Metadata = {
    title: "Поиск по сайту",
};

export default function SearchPage() {
    return (
        <Suspense fallback={<div>Загрузка поиска...</div>}>
            <SearchPageClient />
        </Suspense>
    );
}
