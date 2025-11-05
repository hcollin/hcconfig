/**
 * @vitest-environment jsdom
 */
import { describe, expect, test } from "vitest";
import { Configuration } from "../Configuration.class";
import { IConfig } from "../interfaces/IConfigurationObject";

import { act, renderHook } from "@testing-library/react";
import { useConfig } from "./useConfig";

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
});
