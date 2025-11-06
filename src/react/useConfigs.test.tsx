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
    ok: boolean;
}

describe("React hooks: useConfigs", () => {
    test("useConfigs returns initial config values and makes a render when any key is changed", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
            ok: false,
        });

        const { result } = renderHook(() => useConfigs<TestConfig>(conf));

        expect(result.current.foo).toBe("value");
        expect(result.current.bar).toBe(10);
        expect(result.current.ok).toBeDefined();
        expect(result.current.ok).toBe(false);

        expect(conf.getValue("foo")).toBe("value");

        // A config value is updated
        act(() => {
            conf.setConfig("foo", "newValue");
        });

        expect(conf.getValue("foo")).toBe("newValue");

        expect(result.current.foo).toBe("newValue");
        expect(result.current.bar).toBe(10);
        expect(result.current.ok).toBe(false);
    });

    test("useConfigs with specific keys only listens to those keys", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
            ok: false,
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

    test("useConfigs must return values that are falsy or otherwise strange" , () => {
        const conf = new Configuration<TestConfig>({
            foo: "",
            bar: 0,
            ok: false,
        });

        const { result } = renderHook(() => useConfigs<TestConfig>(conf));

        expect(result.current.foo).toBe("");
        expect(result.current.bar).toBe(0);
        expect(result.current.ok).toBe(false);

        act(() => {
            conf.setConfig("foo", "$32@3\"$53sdf[][]{}<div>&nbsp;</div>");
            conf.setConfig("bar", -93495834.34534);
            conf.setConfig("ok", false);
        });

        expect(result.current.foo).toBe("$32@3\"$53sdf[][]{}<div>&nbsp;</div>");
        expect(result.current.bar).toBe(-93495834.34534);
        expect(result.current.ok).toBe(false);
    });

});
