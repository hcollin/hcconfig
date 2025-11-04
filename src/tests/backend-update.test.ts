import { beforeEach, describe, expect, test, vi } from "vitest";
import { IConfigurationObject } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";
import { ConfigurationError } from "../ConfigurationError";

interface TestConfig extends IConfigurationObject {
    settingA: string;
    settingB: number;
}

describe("Backend update process", () => {
    beforeEach(() => {
        Configuration.clearInstance();
    });

    test("Start backend auto-update process successfully", async () => {
        const update: Partial<TestConfig> = { settingA: "updatedA" };

        const conf = new Configuration<TestConfig>(
            { settingA: "defaultA", settingB: 10 },
            {
                backendUpdateFn: <TestConfig>(): Promise<Partial<TestConfig>> => {
                    return Promise.resolve(update as Partial<TestConfig>);
                },
                backendUpdateIntervalMs: 100,
                backendUpdateStartImmediate: true,
            }
        );

        expect(conf.getValue("settingA")).toBe("defaultA");

        // Wait for some time to allow the update to occur
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(conf.getValue("settingA")).toBe("updatedA");

        conf.stopBackendAutoUpdate();
    });

    test("Backend updates must trigger subscribers", async () => {
        const update: Partial<TestConfig> = { settingB: 42 };

        const conf = new Configuration<TestConfig>(
            { settingA: "defaultA", settingB: 10 },
            {
                backendUpdateFn: <TestConfig>(): Promise<Partial<TestConfig>> => {
                    return Promise.resolve(update as Partial<TestConfig>);
                },
                backendUpdateIntervalMs: 1000,
                backendUpdateStartImmediate: false,
            }
        );

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        conf.subscribe(["settingB"], cb);

        expect(conf.getValue("settingB")).toBe(10);

        conf.startBackendAutoUpdate();

        expect(cb).toHaveBeenCalledTimes(0);

        // Wait for some time to allow the update to occur
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(conf.getValue("settingB")).toBe(42);
        expect(cb).toHaveBeenCalledWith({ settingB: 42 });
        expect(cb).toHaveBeenCalledTimes(1);

        conf.stopBackendAutoUpdate();
    });

    test("Backend updates must trigger until stopped", async () => {
        const update: Partial<TestConfig> = { settingB: 42 };

        const conf = new Configuration<TestConfig>(
            { settingA: "defaultA", settingB: 10 },
            {
                backendUpdateFn: (cc: TestConfig): Promise<Partial<TestConfig>> => {
                    const curB = cc.settingB;
                    const newConf: Partial<TestConfig> = { settingB: curB + 1 };
                    return Promise.resolve(newConf);
                },
                backendUpdateIntervalMs: 50,
                backendUpdateStartImmediate: false,
            }
        );

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        conf.subscribe(["settingB"], cb);

        expect(conf.getValue("settingB")).toBe(10);

        conf.startBackendAutoUpdate();

        expect(cb).toHaveBeenCalledTimes(0);

        // Wait for some time to allow the update to occur
        await new Promise((resolve) => setTimeout(resolve, 160));

        conf.stopBackendAutoUpdate();

        expect(cb).toHaveBeenCalledTimes(4);
        expect(conf.getValue("settingB")).toBe(14);

        // Wait to ensure no more updates occur
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(cb).toHaveBeenCalledTimes(4);
        expect(conf.getValue("settingB")).toBe(14);

        // Restart the update process
        conf.startBackendAutoUpdate();

        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(cb).toHaveBeenCalledTimes(6);
        expect(conf.getValue("settingB")).toBe(16);

        conf.stopBackendAutoUpdate();
    }, 1000);

    test("If backend update function fails, error is caught and no update occurs", async () => {
        const conf = new Configuration<TestConfig>(
            { settingA: "defaultA", settingB: 10 },
            {
                backendUpdateFn: (): Promise<Partial<TestConfig>> => {
                    throw new SyntaxError("Simulated backend failure");
                },
                backendUpdateIntervalMs: 100,
                backendUpdateStartImmediate: false,
            }
        );

        expect(conf.getValue("settingB")).toBe(10);

        await expect(conf.startBackendAutoUpdate()).rejects.toThrow(ConfigurationError);

        conf.stopBackendAutoUpdate();
    });
});
