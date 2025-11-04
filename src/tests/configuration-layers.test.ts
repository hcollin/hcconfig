import { describe, expect, test } from "vitest";
import { IConfigurationObject } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";

interface TestConfig extends IConfigurationObject {
    foo: string;
    bar: number;
}

describe("Configuration Layers", () => {
    test("Default configuration values override each other correctly", () => {
        // Set up default configurations
        const conf = new Configuration<TestConfig>({ foo: "defaultFoo", bar: 42 });

        expect(conf.getValue("foo")).toBe("defaultFoo");
        expect(conf.getValue("bar")).toBe(42);

        conf.setEnvironmentConfig({ foo: "envFoo" });
        expect(conf.getValue("foo")).toBe("envFoo");
        expect(conf.getValue("bar")).toBe(42);

        conf.setBackendConfig({ bar: 100 });
        expect(conf.getValue("foo")).toBe("envFoo");
        expect(conf.getValue("bar")).toBe(100);

        conf.setUserConfig({ foo: "userFoo" });
        expect(conf.getValue("foo")).toBe("userFoo");
        expect(conf.getValue("bar")).toBe(100);

        conf.setConfig("bar", 200);
        expect(conf.getValue("foo")).toBe("userFoo");
        expect(conf.getValue("bar")).toBe(200);

        conf.setEnvironmentConfig({ foo: "newEnvFoo" });
        expect(conf.getValue("foo")).toBe("userFoo");
        expect(conf.getValue("bar")).toBe(200);

        conf.setBackendConfig({ bar: 300 });
        expect(conf.getValue("foo")).toBe("userFoo");
        expect(conf.getValue("bar")).toBe(200);

        conf.setUserConfig({ foo: "newUserFoo" });
        expect(conf.getValue("foo")).toBe("newUserFoo");
        expect(conf.getValue("bar")).toBe(200);
    });
});
