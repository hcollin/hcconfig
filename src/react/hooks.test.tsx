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
import { useConfigs } from "./useConfigs";

interface TestConfig extends IConfig {
    foo: string;
    bar: number;
    ok: boolean;
}

describe("React Hooks combined", () => {
    test("useConfig returns setter and clear functions", () => {
        const conf = new Configuration<TestConfig>({
            foo: "initial",
            bar: 42,
            ok: true,
        });

        expect(conf.getConfigs()).toEqual({
            foo: {
                value: "initial",
                readonly: false,
                level: CONFIGLEVEL.DEFAULT,
            },
            bar: {
                value: 42,
                readonly: false,
                level: CONFIGLEVEL.DEFAULT,
            },
            ok: {
                value: true,
                readonly: false,
                level: CONFIGLEVEL.DEFAULT,
            },
        });

        const { result: resFoo } = renderHook(() => useConfig<TestConfig>(conf, "foo"));
        const { result: configs } = renderHook(() => useConfigs<TestConfig>(conf));

        expect(resFoo.current[0]).toBe("initial");
        expect(configs.current).toEqual({
            foo: "initial",
            bar: 42,
            ok: true,
        });

        act(() => {
            resFoo.current[1]("updated");
        });

        expect(resFoo.current[0]).toBe("updated");
        expect(configs.current).toEqual({
            foo: "updated",
            bar: 42,
            ok: true,
        });

        act(() => {
            resFoo.current[2]();
        });

        expect(resFoo.current[0]).toBe("initial");
        expect(configs.current).toEqual({
            foo: "initial",
            bar: 42,
            ok: true,
        });
    });
});
