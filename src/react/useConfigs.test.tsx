/**
 * @vitest-environment jsdom
 */
import { describe, expect, test } from "vitest";
import { Configuration } from "../Configuration.class";
import { IConfig } from "../interfaces/IConfigurationObject";

import { act, renderHook } from "@testing-library/react";
import { useConfigs } from "./useConfigs";

interface TestConfig extends IConfig {
    foo: string;
    bar: number;
}

describe("React hooks: useConfigs", () => {
    test("useConfigs returns initial config values and makes a render when any key is changed", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
        });

        const { result } = renderHook(() => useConfigs<TestConfig>(conf));

        expect(result.current.foo).toBe("value");
        expect(result.current.bar).toBe(10);

        expect(conf.getValue("foo")).toBe("value");

        // A config value is updated
        act(() => {
            conf.setConfig("foo", "newValue");
        });

        expect(conf.getValue("foo")).toBe("newValue");

        expect(result.current.foo).toBe("newValue");
        expect(result.current.bar).toBe(10);
    });

    test("useConfigs with specific keys only listens to those keys", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
        });

        const { result } = renderHook(() => useConfigs<TestConfig>(conf, ["foo"]));

        expect(result.current.foo).toBe("value");
        expect(result.current.bar).toBeUndefined();

        // A config value we are not interested in is updated
        act(() => {
            conf.setConfig("bar", 20);
        });

        // No change should be reflected since 'bar' was not subscribed to
        expect(result.current.foo).toBe("value");
        expect(result.current.bar).toBeUndefined();

        // A config value we are interested in is updated
        act(() => {
            conf.setConfig("foo", "newValue");
        });

        expect(result.current.foo).toBe("newValue");
        expect(result.current.bar).toBeUndefined();
    });
});
