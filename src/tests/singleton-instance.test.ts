import { beforeEach, describe, expect, test, vi } from "vitest";
import { IConfigurationObject } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";
import { ERRORCODES } from "../ERRORCODES";

describe("Singleton instance of Configuration", () => {
    interface TestConfig extends IConfigurationObject {
        settingA: string;
        settingB: number;
    }

    beforeEach(() => {
        Configuration.clearInstance();
    });

    test("Create singleton instance successfully", () => {
        const conf1 = new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 }, { singleton: true });

        expect(conf1.getValue("settingA")).toBe("defaultA");
        expect(conf1.getValue("settingB")).toBe(10);

        const cinst = Configuration.getInstance<TestConfig>();
        expect(cinst.getValue("settingA")).toBe("defaultA");
        expect(cinst.getValue("settingB")).toBe(10);

        const cinst2 = Configuration.getInstance<TestConfig>();
        expect(cinst2).toBe(cinst); // Both instances should be the same

        cinst.setConfig("settingA", "newA");
        expect(cinst2.getValue("settingA")).toBe("newA"); // Change should reflect in both instances
    });

    test("Creating a singleton instance again should return the original instance. New default Options are ignored", () => {
        const conf1 = new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 }, { singleton: true });

        expect(conf1.getValue("settingA")).toBe("defaultA");

        const conf2 = new Configuration<TestConfig>({ settingA: "anotherA", settingB: 20 }, { singleton: true });

        expect(conf2.getValue("settingA")).toBe("defaultA");
    });

    test("Create a new instance with getInstance", () => {
        const conf1 = Configuration.getInstance<TestConfig>({ settingA: "defaultA", settingB: 10 });
        expect(conf1.getValue("settingA")).toBe("defaultA");

        const conf2 = Configuration.getInstance<TestConfig>();
        expect(conf2).toBe(conf1);
    });

    test("Error when creating singleton instance without default config", () => {
        expect(() => {
            Configuration.getInstance<TestConfig>();
        }).toThrowError(ERRORCODES.INSTANCE_NEEDS_DEFAULTCONFIGS);
    });

    test("Get Configs from singleton instance directly", () => {
        new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 }, { singleton: true });

        expect(Configuration.getConfigs<TestConfig>()).toEqual({ settingA: "defaultA", settingB: 10 });
    });

    test("Get Value from singleton instance directly", () => {
        new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 }, { singleton: true });

        expect(Configuration.getValue<TestConfig>("settingA")).toBe("defaultA");
    });

    test("Subscribe to changes on singleton instance directly", () => {
        new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 }, { singleton: true });

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsubscribe = Configuration.getInstance<TestConfig>().subscribe(["settingA"], cb);

        expect(Configuration.getValue<TestConfig>("settingA")).toBe("defaultA");

        Configuration.getInstance<TestConfig>().setConfig("settingA", "newA"); // This should trigger the listener

        expect(cb).toHaveBeenCalledWith({ settingA: "newA" });
        expect(cb).toHaveBeenCalledTimes(1);

        unsubscribe();
    });

    test("Clear singleton instance", () => {
        const conf1 = Configuration.getInstance<TestConfig>({ settingA: "defaultA", settingB: 10 });
        expect(conf1.getValue("settingA")).toBe("defaultA");
        Configuration.clearInstance();

        const conf2 = Configuration.getInstance<TestConfig>({ settingA: "newDefaultA", settingB: 20 });
        expect(conf2.getValue("settingA")).toBe("newDefaultA");
        expect(conf2).not.toBe(conf1);
    });

    test("If instance is not a singleton, getInstance throws error", () => {
        new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 }, { singleton: false });

        expect(() => {
            Configuration.getInstance<TestConfig>();
        }).toThrowError(ERRORCODES.INSTANCE_NEEDS_DEFAULTCONFIGS);
    });

    test("If no singleton instance exists, getConfigs throws error", () => {
        const conf = new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 }, { singleton: false });
        expect(() => {
            Configuration.getConfigs<TestConfig>();
        }).toThrowError(ERRORCODES.NO_CONFIGURATION_INSTANCE);
    });
});
