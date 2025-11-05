import { describe, test, expect, beforeEach } from "vitest";
import { CONFIGLEVEL, Configuration, ERRORCODES, useConfig, useConfigs, ConfigurationError } from "../dist/index.es.js";
import type { IConfig } from "../dist/index.d.ts";

interface TestConfig extends IConfig {
    foo: string;
    bar: number;
}

describe("Distributed package Test", () => {
    beforeEach(() => {
        Configuration.clearInstance();
    });

    test("Library exports all the necessary modules", () => {
        // Configuration class
        expect(typeof Configuration).toBe("function");

        // React Hooks
        expect(typeof useConfig).toBe("function");
        expect(typeof useConfigs).toBe("function");

        // ENUMS
        expect(CONFIGLEVEL).toBeDefined();
        expect(CONFIGLEVEL.DEFAULT).toBe("default");
        expect(CONFIGLEVEL.ENVIRONMENT).toBe("environment");
        expect(CONFIGLEVEL.BACKEND).toBe("backend");
        expect(CONFIGLEVEL.USER).toBe("user");
        expect(CONFIGLEVEL.DYNAMIC).toBe("dynamic");

        expect(ERRORCODES).toBeDefined();

        // ConfigurationError
        expect(typeof ConfigurationError).toBe("function");
        expect(() => {
            throw new ConfigurationError(ERRORCODES.UNKNOWN_CONFIG_KEY);
        }).toThrowError(ConfigurationError);
    });

    test("Configuration class has at least basic functionality", () => {
        expect(typeof Configuration).toBe("function");

        const config = new Configuration({
            foo: "value",
            bar: 10,
        });

        expect(config.getValue("foo")).toBe("value");
        expect(config.getValue("bar")).toBe(10);

        config.setConfig("foo", "newValue");

        expect(config.getValue("foo")).toBe("newValue");
    });
});
