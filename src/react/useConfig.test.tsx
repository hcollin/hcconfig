/**
 * @vitest-environment jsdom
 */
import { describe, expect, test } from "vitest";
import { Configuration } from "../Configuration.class";
import { IConfig } from "../interfaces/IConfigurationObject";

import { act, renderHook } from "@testing-library/react";
import { useConfig } from "./useConfig";
import { ConfigurationError } from "../ConfigurationError";
import { ERRORCODES } from "../enums/ERRORCODES";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";

interface TestConfig extends IConfig {
    foo: string;
    bar: number;
}

describe("React hooks: useConfig", () => {
    test("useConfig with specific keys only listens to those keys", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
        });

        const { result } = renderHook(() => useConfig<TestConfig>(conf, "foo"));

        expect(result.current[0]).toBe("value");

        // A config value we are not interested in is updated
        act(() => {
            conf.setConfig("foo", "newValue");
        });

        expect(result.current[0]).toBe("newValue");
    });

    test("useConfig throws error UNKNOWN_CONFIG_KEY for unknown key", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
        });

        expect(() => {
            renderHook(() => useConfig<TestConfig>(conf, "baz" as keyof TestConfig));
        }).toThrowError(ERRORCODES.UNKNOWN_CONFIG_KEY);
    });

    test("useConfig return values are of correct types", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
        });

        const { result: resultFoo } = renderHook(() => useConfig<TestConfig>(conf, "foo"));
        expect(typeof resultFoo.current[0]).toBe("string");
        expect(typeof resultFoo.current[0]).not.toBe("object");

        const { result: resultBar } = renderHook(() => useConfig<TestConfig>(conf, "bar"));
        expect(typeof resultBar.current[0]).toBe("number");
    });

    test("Alter the config value via the setter function", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
        });

        const { result: resultFoo } = renderHook(() => useConfig<TestConfig>(conf, "foo"));

        expect(resultFoo.current[0]).toBe("value");
        expect(conf.getValue("foo")).toBe("value");
        expect(conf.getConfig("foo")).toEqual({ value: "value", level: CONFIGLEVEL.DEFAULT, readonly: false });

        act(() => {
            const setFoo = resultFoo.current[1];
            setFoo("updatedValue");
        });

        expect(resultFoo.current[0]).toBe("updatedValue");

        expect(conf.getValue("foo")).toBe("updatedValue");
        expect(conf.getConfig("foo")).toEqual({ value: "updatedValue", level: CONFIGLEVEL.DYNAMIC, readonly: false });
    });

    test("Delete dynamic configuration via delete function provided by useConfig", () => {
        const conf = new Configuration<TestConfig>({
            foo: "value",
            bar: 10,
        });

        const { result: resultFoo } = renderHook(() => useConfig<TestConfig>(conf, "foo"));

        expect(resultFoo.current[0]).toBe("value");
        expect(conf.getValue("foo")).toBe("value");
        expect(conf.getConfig("foo")).toEqual({ value: "value", level: CONFIGLEVEL.DEFAULT, readonly: false });

        act(() => {
            const setFoo = resultFoo.current[1];
            setFoo("updatedValue");
        });

        expect(resultFoo.current[0]).toBe("updatedValue");
        expect(conf.getValue("foo")).toBe("updatedValue");
        expect(conf.getConfig("foo")).toEqual({ value: "updatedValue", level: CONFIGLEVEL.DYNAMIC, readonly: false });

        act(() => {
            const clearFoo = resultFoo.current[2];
            clearFoo();
        });

        expect(resultFoo.current[0]).toBe("value");
        expect(conf.getValue("foo")).toBe("value");
        expect(conf.getConfig("foo")).toEqual({ value: "value", level: CONFIGLEVEL.DEFAULT, readonly: false });
    });
});
