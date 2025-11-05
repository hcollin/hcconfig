import { beforeEach, describe, expect, test, vi } from "vitest";
import { IConfig } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";
import { ERRORCODES } from "../enums/ERRORCODES";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";

describe("Singleton instance of Configuration", () => {
    interface TestConfig extends IConfig {
        foo: string;
        bar: number;
    }

    beforeEach(() => {
        Configuration.clearInstance();
    });

    test("Create singleton instance successfully", () => {
        const conf1 = new Configuration<TestConfig>({ foo: "defaultA", bar: 10 }, { singleton: true });

        expect(conf1.getValue("foo")).toBe("defaultA");
        expect(conf1.getValue("bar")).toBe(10);

        const cinst = Configuration.getInstance<TestConfig>();
        expect(cinst.getValue("foo")).toBe("defaultA");
        expect(cinst.getValue("bar")).toBe(10);

        const cinst2 = Configuration.getInstance<TestConfig>();
        expect(cinst2).toBe(cinst); // Both instances should be the same

        cinst.setConfig("foo", "newA");
        expect(cinst2.getValue("foo")).toBe("newA"); // Change should reflect in both instances
    });

    test("Creating a singleton instance again should return the original instance. New default Options are ignored", () => {
        const conf1 = new Configuration<TestConfig>({ foo: "defaultA", bar: 10 }, { singleton: true });

        expect(conf1.getValue("foo")).toBe("defaultA");

        const conf2 = new Configuration<TestConfig>({ foo: "anotherA", bar: 20 }, { singleton: true });

        expect(conf2.getValue("foo")).toBe("defaultA");
    });

    test("Create a new instance with getInstance", () => {
        const conf1 = Configuration.getInstance<TestConfig>({ foo: "defaultA", bar: 10 });
        expect(conf1.getValue("foo")).toBe("defaultA");

        const conf2 = Configuration.getInstance<TestConfig>();
        expect(conf2).toBe(conf1);
    });

    test("Error when creating singleton instance without default config", () => {
        expect(() => {
            Configuration.getInstance<TestConfig>();
        }).toThrowError(ERRORCODES.INSTANCE_NEEDS_DEFAULTCONFIGS);
    });

    test("Get Configs from singleton instance directly", () => {
        new Configuration<TestConfig>({ foo: "defaultA", bar: 10 }, { singleton: true });

        expect(Configuration.getConfigs<TestConfig>()).toEqual({
            foo: { value: "defaultA", level: CONFIGLEVEL.DEFAULT, readonly: false },
            bar: { value: 10, level: CONFIGLEVEL.DEFAULT, readonly: false },
        });
    });

    test("Get Value from singleton instance directly", () => {
        new Configuration<TestConfig>({ foo: "defaultA", bar: 10 }, { singleton: true });

        expect(Configuration.getValue<TestConfig>("foo")).toBe("defaultA");
    });

    test("Subscribe to changes on singleton instance directly", () => {
        new Configuration<TestConfig>({ foo: "defaultA", bar: 10 }, { singleton: true });

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsubscribe = Configuration.getInstance<TestConfig>().subscribe(["foo"], cb);

        expect(Configuration.getValue<TestConfig>("foo")).toBe("defaultA");

        Configuration.getInstance<TestConfig>().setConfig("foo", "newA"); // This should trigger the listener

        expect(cb).toHaveBeenCalledWith({ foo: { value: "newA", level: CONFIGLEVEL.DYNAMIC, readonly: false } });
        expect(cb).toHaveBeenCalledTimes(1);

        unsubscribe();
    });

    test("Clear singleton instance", () => {
        const conf1 = Configuration.getInstance<TestConfig>({ foo: "defaultA", bar: 10 });
        expect(conf1.getValue("foo")).toBe("defaultA");
        Configuration.clearInstance();

        const conf2 = Configuration.getInstance<TestConfig>({ foo: "newDefaultA", bar: 20 });
        expect(conf2.getValue("foo")).toBe("newDefaultA");
        expect(conf2).not.toBe(conf1);
    });

    test("If instance is not a singleton, getInstance throws error", () => {
        new Configuration<TestConfig>({ foo: "defaultA", bar: 10 }, { singleton: false });

        expect(() => {
            Configuration.getInstance<TestConfig>();
        }).toThrowError(ERRORCODES.INSTANCE_NEEDS_DEFAULTCONFIGS);
    });

    test("If no singleton instance exists, getConfigs throws error", () => {
        const conf = new Configuration<TestConfig>({ foo: "defaultA", bar: 10 }, { singleton: false });
        expect(() => {
            Configuration.getConfigs<TestConfig>();
        }).toThrowError(ERRORCODES.NO_CONFIGURATION_INSTANCE);
    });
});
