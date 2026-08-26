import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Явный include обязателен: дефолтный шаблон vitest не исключает .next,
 * и раннер подхватывал бы собранные копии тестов из кеша сборки.
 */
export default defineConfig({
    test: {
        environment: "node",
        include: ["lib/**/*.test.ts"],
    },
    // Тесты и модули блога тянут @/lib/types только как `import type`, и такой
    // импорт стирается при трансформации. Но одна замена `import type` на
    // обычный import ломала бы весь прогон без внятной ошибки — алиас дешевле.
    resolve: {
        alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
    },
});
