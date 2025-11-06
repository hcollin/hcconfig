import { describe, expect, test, vi } from "vitest";
import { Configuration } from "../Configuration.class";
import { IConfig } from "../interfaces/IConfigurationObject";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";

describe("Different types and values", () => {
    test("Boolean values", () => {
        interface BoolConfig extends IConfig {
            flag: boolean;
            foo: string;
        }

        const c = new Configuration<BoolConfig>({
            flag: false,
            foo: "bar",
        });

        expect(c.getValue("flag")).toBeDefined();
        expect(c.getValue("flag")).toBe(false);

        c.setConfig("flag", true);
        expect(c.getValue("flag")).toBe(true);

        c.setConfig("flag", false);
        expect(c.getValue("flag")).toBe(false);

        const cb = vi.fn();
        c.subscribe(["flag"], cb);

        c.setConfig("flag", true);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith({ flag: { value: true, readonly: false, level: CONFIGLEVEL.DYNAMIC } });

        c.setConfig("flag", false);

        expect(cb).toHaveBeenCalledTimes(2);
        expect(cb).toHaveBeenCalledWith({ flag: { value: false, readonly: false, level: CONFIGLEVEL.DYNAMIC } });
    });

    test("Number values", () => {
        interface NumConfig extends IConfig {
            count: number;
            foo: string;
        }

        const c = new Configuration<NumConfig>({
            count: 0,
            foo: "bar",
        });

        expect(c.getValue("count")).toBeDefined();
        expect(c.getValue("count")).toBe(0);

        c.setConfig("count", 42);
        expect(c.getValue("count")).toBe(42);

        c.setConfig("count", -7);
        expect(c.getValue("count")).toBe(-7);

        const cb = vi.fn();
        c.subscribe(["count"], cb);

        c.setConfig("count", 100);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith({ count: { value: 100, readonly: false, level: CONFIGLEVEL.DYNAMIC } });

        c.setConfig("count", 0);

        expect(cb).toHaveBeenCalledTimes(2);
        expect(cb).toHaveBeenCalledWith({ count: { value: 0, readonly: false, level: CONFIGLEVEL.DYNAMIC } });
    });

    test("String value", () => {
        interface StrConfig extends IConfig {
            foo: string;
            FOO: string;
        }

        const c = new Configuration<StrConfig>({
            foo: "bar",
            FOO: "default",
        });

        expect(c.getValue("foo")).toBeDefined();
        expect(c.getValue("foo")).toBe("bar");
        expect(c.getValue("FOO")).toBeDefined();
        expect(c.getValue("FOO")).toBe("default");

        c.setConfig("foo", "baz");
        expect(c.getValue("foo")).toBe("baz");
    });
});
