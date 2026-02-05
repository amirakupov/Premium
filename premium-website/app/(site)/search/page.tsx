import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Загрузка поиска...</div>}>
      <SearchPageClient />
    </Suspense>
  );
}

