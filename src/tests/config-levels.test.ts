import { describe, expect, test } from "vitest";
import { ConfigValue, IConfig, IConfigurationObject } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";
import { ERRORCODES } from "../enums/ERRORCODES";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";
import { getCurrentConfigObject, getConfigObjectInLevel, getValueInLevel } from "./test-tools";
import { get } from "http";

interface TestConfig extends IConfig {
    foo: string;
    bar: number;
}

describe("Configuration levels", () => {
    test("If no default configuration is provided, an error is thrown", () => {
        expect(() => {
            // @ts-ignore
            new Configuration<TestConfig>();
        }).toThrowError("Cannot convert undefined or null to object");
    });

    test("When generating new configuration instance only the default values are set", () => {
        const c = new Configuration<TestConfig>({ foo: "test", bar: 42 });
        expect(c.getValue("foo")).toBe("test");
        expect(c.getValue("bar")).toBe(42);

        const def = c.getConfigsForLevel(CONFIGLEVEL.DEFAULT);
        expect(typeof def.foo).toBe("object");
        expect(typeof def.bar).toBe("object");

        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.ENVIRONMENT)).length).toBe(0);
        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.BACKEND)).length).toBe(0);
        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.USER)).length).toBe(0);
        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.DYNAMIC)).length).toBe(0);

        expect(getCurrentConfigObject(c, "foo")?.level).toBe(CONFIGLEVEL.DEFAULT);
        expect(getCurrentConfigObject(c, "foo")?.value).toBe("test");

        expect(getCurrentConfigObject(c, "bar")?.level).toBe(CONFIGLEVEL.DEFAULT);
        expect(getCurrentConfigObject(c, "bar")?.value).toBe(42);

        // All Configs must return correct results too
        const all = c.getConfigs();
        expect(typeof all.foo).toBe("object");
        expect(typeof all.bar).toBe("object");

        const foo = all.foo as unknown as IConfigurationObject;
        expect(foo.value).toBe("test");
        expect(foo.level).toBe(CONFIGLEVEL.DEFAULT);

        const bar = all.bar as unknown as IConfigurationObject;
        expect(bar.value).toBe(42);
        expect(bar.level).toBe(CONFIGLEVEL.DEFAULT);
    });

    test("Setting a value will target the dynamic level", () => {
        const c = new Configuration<TestConfig>({ foo: "test", bar: 42 });
        expect(c.getValue("foo")).toBe("test");
        expect(c.getValue("bar")).toBe(42);

        c.setConfig("foo", "newTest");

        const def = c.getConfigsForLevel(CONFIGLEVEL.DEFAULT);
        expect(typeof def.foo).toBe("object");
        expect(typeof def.bar).toBe("object");

        const defFoo = def.foo as unknown as IConfigurationObject;
        expect(defFoo.value).toBe("test");
        expect(defFoo.level).toBe(CONFIGLEVEL.DEFAULT);

        const defBar = def.bar as unknown as IConfigurationObject;
        expect(defBar.value).toBe(42);
        expect(defBar.level).toBe(CONFIGLEVEL.DEFAULT);

        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.ENVIRONMENT)).length).toBe(0);
        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.BACKEND)).length).toBe(0);
        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.USER)).length).toBe(0);
        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.DYNAMIC)).length).toBe(1);

        const all = c.getConfigs();
        expect(typeof all.foo).toBe("object");
        expect(typeof all.bar).toBe("object");

        const foo = all.foo as unknown as IConfigurationObject;
        expect(foo.value).toBe("newTest");
        expect(foo.level).toBe(CONFIGLEVEL.DYNAMIC);

        const bar = all.bar as unknown as IConfigurationObject;
        expect(bar.value).toBe(42);
        expect(bar.level).toBe(CONFIGLEVEL.DEFAULT);
    });

    test("Deleting a config only targets the dynamic level", () => {
        const c = new Configuration<TestConfig>({ foo: "test", bar: 42 });
        expect(c.getValue("foo")).toBe("test");
        expect(c.getValue("bar")).toBe(42);

        c.setConfig("foo", "newTest");
        expect(c.getValue("foo")).toBe("newTest");

        expect(getConfigObjectInLevel(c, "foo", CONFIGLEVEL.DYNAMIC)).toBeDefined();
        expect(getConfigObjectInLevel(c, "foo", CONFIGLEVEL.ENVIRONMENT)).toBeUndefined();

        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.DYNAMIC)).length).toBe(1);

        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.DEFAULT)).length).toBe(2);
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.DEFAULT)).toBe("test");

        c.deleteConfig("foo");
        expect(c.getValue("foo")).toBe("test");

        expect(getConfigObjectInLevel(c, "foo", CONFIGLEVEL.DYNAMIC)).toBeUndefined();
        expect(Object.keys(c.getConfigsForLevel(CONFIGLEVEL.DYNAMIC)).length).toBe(0);
    });

    test("Other levels override their preceding levels correctly", () => {
        const c = new Configuration<TestConfig>({ foo: "defaultFoo", bar: 42 });
        expect(c.getValue("foo")).toBe("defaultFoo");
        expect(c.getValue("bar")).toBe(42);

        c.setEnvironmentConfig({ foo: "envFoo" });
        expect(c.getValue("foo")).toBe("envFoo");
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.ENVIRONMENT)).toBe("envFoo");
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.DEFAULT)).toBe("defaultFoo");
        expect(getCurrentConfigObject(c, "foo")?.level).toBe(CONFIGLEVEL.ENVIRONMENT);

        c.setBackendConfig({ bar: 10 });
        expect(c.getValue("bar")).toBe(10);
        expect(c.getValue("foo")).toBe("envFoo");
        expect(getValueInLevel(c, "bar", CONFIGLEVEL.BACKEND)).toBe(10);
        expect(getValueInLevel(c, "bar", CONFIGLEVEL.ENVIRONMENT)).toBeUndefined();
        expect(getValueInLevel(c, "bar", CONFIGLEVEL.DEFAULT)).toBe(42);
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.BACKEND)).toBeUndefined();
        expect(getCurrentConfigObject(c, "foo")?.level).toBe(CONFIGLEVEL.ENVIRONMENT);
        expect(getCurrentConfigObject(c, "bar")?.level).toBe(CONFIGLEVEL.BACKEND);

        c.setUserConfig({ bar: 20, foo: "userFoo" });
        expect(c.getValue("bar")).toBe(20);
        expect(c.getValue("foo")).toBe("userFoo");
        expect(getCurrentConfigObject(c, "foo")?.level).toBe(CONFIGLEVEL.USER);
        expect(getCurrentConfigObject(c, "bar")?.level).toBe(CONFIGLEVEL.USER);

        c.setConfig("bar", 100);

        // Now check that each level has the correct values
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.DEFAULT)).toBe("defaultFoo");
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.ENVIRONMENT)).toBe("envFoo");
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.BACKEND)).toBeUndefined();
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.USER)).toBe("userFoo");
        expect(getValueInLevel(c, "foo", CONFIGLEVEL.DYNAMIC)).toBeUndefined();

        expect(getValueInLevel(c, "bar", CONFIGLEVEL.DEFAULT)).toBe(42);
        expect(getValueInLevel(c, "bar", CONFIGLEVEL.ENVIRONMENT)).toBeUndefined();
        expect(getValueInLevel(c, "bar", CONFIGLEVEL.BACKEND)).toBe(10);
        expect(getValueInLevel(c, "bar", CONFIGLEVEL.USER)).toBe(20);
        expect(getValueInLevel(c, "bar", CONFIGLEVEL.DYNAMIC)).toBe(100);

        // Current values
        expect(c.getValue("foo")).toBe("userFoo");
        expect(c.getValue("bar")).toBe(100);

        expect(getCurrentConfigObject(c, "foo")?.level).toBe(CONFIGLEVEL.USER);
        expect(getCurrentConfigObject(c, "bar")?.level).toBe(CONFIGLEVEL.DYNAMIC);
    });
});
