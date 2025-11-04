import { describe, test, expect, beforeEach } from "vitest";
import { Configuration } from "../dist/index.es.js";

describe("Distributed package Test", () => {
    beforeEach(() => {
        Configuration.clearInstance();
    });

    test("Configuration class is accessible from dist", () => {
        expect(typeof Configuration).toBe("function");
    });
});
