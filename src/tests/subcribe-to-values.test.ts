import { describe, expect, test, vi } from "vitest";
import { IConfigurationObject } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";

describe("Subscribe to Configuration Values", () => {
    interface TestConfig extends IConfigurationObject {
        settingA: string;
        settingB: number;
    }

    test("Listener is called when subscribed keys change with setValue", () => {
        const conf = new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 });

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsubscribe = conf.subscribe(["settingA"], cb);

        expect(conf.getValue("settingA")).toBe("defaultA");

        conf.setConfig("settingA", "newA"); // This should trigger the listener

        expect(cb).toHaveBeenCalledWith({ settingA: "newA" });
        expect(cb).toHaveBeenCalledTimes(1);

        unsubscribe();
    });

    test("Listener is not called after unsubscribe", () => {
        const conf = new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 });

        const cb = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsubscribe = conf.subscribe(["settingB"], cb);

        expect(conf.getValue("settingB")).toBe(10);

        conf.setConfig("settingB", 20); // This should trigger the listener

        expect(cb).toHaveBeenCalledWith({ settingB: 20 });
        expect(cb).toHaveBeenCalledTimes(1);

        unsubscribe();

        conf.setConfig("settingB", 30); // This should NOT trigger the listener

        expect(cb).toHaveBeenCalledTimes(1); // Still only called once
    });

    test("All listeners are notified only on the key changes they are interested in", () => {
        const conf = new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 });

        const cbA = vi.fn((changedKeys: Partial<TestConfig>) => {});
        const cbB = vi.fn((changedKeys: Partial<TestConfig>) => {});

        conf.subscribe(["settingA"], cbA);
        conf.subscribe(["settingB"], cbB);

        conf.setConfig("settingA", "newA");
        conf.setConfig("settingB", 20);

        expect(cbA).toHaveBeenCalledWith({ settingA: "newA" });
        expect(cbA).toHaveBeenCalledTimes(1);

        expect(cbB).toHaveBeenCalledWith({ settingB: 20 });
        expect(cbB).toHaveBeenCalledTimes(1);
    });

    test("If no keys are provided the subscriber is informed of all key changes", () => {
        const conf = new Configuration<TestConfig>({ settingA: "defaultA", settingB: 10 });

        const cbA = vi.fn((changedKeys: Partial<TestConfig>) => {});

        const unsub = conf.subscribe([], cbA);

        conf.setConfig("settingA", "newA");

        expect(cbA).toHaveBeenCalledWith({ settingA: "newA", settingB: 10 });

        conf.setConfig("settingB", 20);

        expect(cbA).toHaveBeenCalledWith({ settingA: "newA", settingB: 20 });

        unsub();

        conf.setConfig("settingA", "anotherA");

        expect(cbA).toHaveBeenCalledTimes(2); // No new calls after unsubscribe
    });
});
