import { beforeEach, describe, expect, test, vi } from "vitest";
import { IConfig } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";
import { ConfigurationError } from "../ConfigurationError";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";

interface TestConfig extends IConfig {
    foo: string;
    bar: number;
}

describe("Backend update process", () => {
    beforeEach(() => {
        Configuration.clearInstance();
    });

    test("Start backend auto-update process successfully", async () => {
        const update: Partial<TestConfig> = { foo: "updatedA" };

        const conf = new Configuration<TestConfig>(
            { foo: "defaultA", bar: 10 },
            {
                backendUpdateFn: <TestConfig>(): Promise<Partial<TestConfig>> => {
                    return Promise.resolve(update as Partial<TestConfig>);
                },
                backendUpdateIntervalMs: 100,
                backendUpdateStartImmediate: true,
            }
        );

        expect(conf.getValue("foo")).toBe("defaultA");

        // Wait for some time to allow the update to occur
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(conf.getValue("foo")).toBe("updatedA");

        conf.stopBackendAutoUpdate();
    });

    test("Backend updates must trigger subscribers", async () => {
        const update: Partial<TestConfig> = { bar: 42 };

        const conf = new Configuration<TestConfig>(
            { foo: "defaultA", bar: 10 },
            {
                backendUpdateFn: <TestConfig>(): Promise<Partial<TestConfig>> => {
                    return Promise.resolve(update as Partial<TestConfig>);
                },
                backendUpdateIntervalMs: 1000,
                backendUpdateStartImmediate: false,
            }
        );

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        conf.subscribe(["bar"], cb);

        expect(conf.getValue("bar")).toBe(10);

        conf.startBackendAutoUpdate();

        expect(cb).toHaveBeenCalledTimes(0);

        // Wait for some time to allow the update to occur
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(conf.getValue("bar")).toBe(42);
        expect(cb).toHaveBeenCalledWith({ bar: { value: 42, level: CONFIGLEVEL.BACKEND, readonly: false } });
        expect(cb).toHaveBeenCalledTimes(1);

        conf.stopBackendAutoUpdate();
    });

    test("Backend updates must trigger until stopped", async () => {
        const update: Partial<TestConfig> = { bar: 42 };

        const conf = new Configuration<TestConfig>(
            { foo: "defaultA", bar: 10 },
            {
                backendUpdateFn: (cc: TestConfig): Promise<Partial<TestConfig>> => {
                    const newConf = Configuration.helperConvertToValueObject(cc);
                    newConf.bar = (newConf.bar as number) + 1;
                    return Promise.resolve(newConf);
                },
                backendUpdateIntervalMs: 50,
                backendUpdateStartImmediate: false,
            }
        );

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        conf.subscribe(["bar"], cb);

        expect(conf.getValue("bar")).toBe(10);

        conf.startBackendAutoUpdate();

        expect(cb).toHaveBeenCalledTimes(0);

        // Wait for some time to allow the update to occur
        await new Promise((resolve) => setTimeout(resolve, 160));

        conf.stopBackendAutoUpdate();

        expect(cb).toHaveBeenCalledTimes(4);
        expect(conf.getValue("bar")).toBe(14);

        // Wait to ensure no more updates occur
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(cb).toHaveBeenCalledTimes(4);
        expect(conf.getValue("bar")).toBe(14);

        // Restart the update process
        conf.startBackendAutoUpdate();

        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(cb).toHaveBeenCalledTimes(6);
        expect(conf.getValue("bar")).toBe(16);

        conf.stopBackendAutoUpdate();
    }, 1000);

    test("If backend update function fails, error is caught and no update occurs", async () => {
        const conf = new Configuration<TestConfig>(
            { foo: "defaultA", bar: 10 },
            {
                backendUpdateFn: (): Promise<Partial<TestConfig>> => {
                    throw new SyntaxError("Simulated backend failure");
                },
                backendUpdateIntervalMs: 100,
                backendUpdateStartImmediate: false,
            }
        );

        expect(conf.getValue("bar")).toBe(10);

        await expect(conf.startBackendAutoUpdate()).rejects.toThrow(ConfigurationError);

        conf.stopBackendAutoUpdate();
    });
});
