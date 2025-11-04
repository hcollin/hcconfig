import { describe, expect, test } from "vitest";
import { IConfigurationObject } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";

interface TestConfig extends IConfigurationObject {
    foo: string;
}

describe("Dynamic Configurations", () => {
    test("Setting dynamic configuration value overrides default value", () => {
        const conf = new Configuration<TestConfig>({ foo: "bar" });

        expect(conf.getValue("foo")).toBe("bar");

        conf.setConfig("foo", "baz");

        expect(conf.getValue("foo")).toBe("baz");
    });

    test("Deleting dynamic configuration value reverts to previous layer", () => {
        const conf = new Configuration<TestConfig>({ foo: "bar" });

        expect(conf.getValue("foo")).toBe("bar");

        conf.setEnvironmentConfig({ foo: "envFoo" });
        expect(conf.getValue("foo")).toBe("envFoo");

        conf.setConfig("foo", "baz");
        expect(conf.getValue("foo")).toBe("baz");

        conf.deleteConfig("foo");
        expect(conf.getValue("foo")).toBe("envFoo");

        conf.deleteConfig("foo"); // Deleting again should have no effect
        expect(conf.getValue("foo")).toBe("envFoo");
    });
});
