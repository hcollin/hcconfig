import { describe, expect, test, vi } from "vitest";
import { IConfig } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";
import { getConfigObjectInLevel } from "./test-tools";

describe("Subscribe to Configuration Values", () => {
    interface TestConfig extends IConfig {
        foo: string;
        bar: number;
    }

    test("Listener is called when subscribed keys change with setValue", () => {
        const conf = new Configuration<TestConfig>({ foo: "defaultA", bar: 10 });

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsubscribe = conf.subscribe(["foo"], cb);

        expect(conf.getValue("foo")).toBe("defaultA");

        conf.setConfig("foo", "newA"); // This should trigger the listener

        expect(getConfigObjectInLevel(conf, "foo", CONFIGLEVEL.DYNAMIC)?.readonly).toBe(false);

        expect(cb).toHaveBeenCalledWith({ foo: { value: "newA", level: CONFIGLEVEL.DYNAMIC, readonly: false } });
        expect(cb).toHaveBeenCalledTimes(1);

        unsubscribe();
    });

    test("Listener is not called after unsubscribe", () => {
        const conf = new Configuration<TestConfig>({ foo: "defaultA", bar: 10 });

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsubscribe = conf.subscribe(["bar"], cb);

        expect(conf.getValue("bar")).toBe(10);

        conf.setConfig("bar", 20); // This should trigger the listener

        expect(cb).toHaveBeenCalledWith({ bar: { value: 20, level: CONFIGLEVEL.DYNAMIC, readonly: false } });
        expect(cb).toHaveBeenCalledTimes(1);

        unsubscribe();

        conf.setConfig("bar", 30); // This should NOT trigger the listener

        expect(cb).toHaveBeenCalledTimes(1); // Still only called once
    });

    test("All listeners are notified only on the key changes they are interested in", () => {
        const conf = new Configuration<TestConfig>({ foo: "defaultA", bar: 10 });

        const cbA = vi.fn((changedKeys: Partial<TestConfig>) => {});
        const cbB = vi.fn((changedKeys: Partial<TestConfig>) => {});

        conf.subscribe(["foo"], cbA);
        conf.subscribe(["bar"], cbB);

        conf.setConfig("foo", "newA");
        conf.setConfig("bar", 20);

        expect(cbA).toHaveBeenCalledWith({ foo: { value: "newA", level: CONFIGLEVEL.DYNAMIC, readonly: false } });
        expect(cbA).toHaveBeenCalledTimes(1);

        expect(cbB).toHaveBeenCalledWith({ bar: { value: 20, level: CONFIGLEVEL.DYNAMIC, readonly: false } });
        expect(cbB).toHaveBeenCalledTimes(1);
    });

    test("If no keys are provided the subscriber is informed of all key changes", () => {
        const conf = new Configuration<TestConfig>({ foo: "defaultA", bar: 10 });

        const cbA = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsub = conf.subscribe([], cbA);

        conf.setConfig("foo", "newA");

        expect(cbA).toHaveBeenCalledWith({
            foo: { value: "newA", level: CONFIGLEVEL.DYNAMIC, readonly: false },
            bar: { value: 10, level: CONFIGLEVEL.DEFAULT, readonly: false },
        });

        conf.setConfig("bar", 20);

        expect(cbA).toHaveBeenCalledWith({
            foo: { value: "newA", level: CONFIGLEVEL.DYNAMIC, readonly: false },
            bar: { value: 20, level: CONFIGLEVEL.DYNAMIC, readonly: false },
        });

        unsub();

        conf.setConfig("foo", "anotherA");

        expect(cbA).toHaveBeenCalledTimes(2); // No new calls after unsubscribe
    });
});
