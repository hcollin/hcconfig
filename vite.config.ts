/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "hcconfig",
            fileName: (format) => `index.${format}.js`,
            formats: ["es", "cjs", "umd"],
        },
        rollupOptions: {
            external: ["react", "react-dom"], // add external dependencies here
        },
    },
    plugins: [
        dts({
            tsconfigPath: "./tsconfig.json",
            // rollupTypes: true,
            insertTypesEntry: true,
        }),
    ],
    test: {
        allowOnly: false,
        hideSkippedTests: true,
    },
});
