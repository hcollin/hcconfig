import { beforeEach, describe, expect, test, vi } from "vitest";
import { IConfig, IConfigurationObject } from "../interfaces/IConfigurationObject";
import { Configuration } from "../Configuration.class";
import { ConfigurationError } from "../ConfigurationError";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";

interface TestConfig extends IConfig {
    foo: string;
    bar: number;
}

describe("Read only option handling", () => {
    test("Setting a key as read-only prevents changes in dynamic level", () => {
        const conf = new Configuration<TestConfig>(
            { foo: "defaultA", bar: 10 },
            {
                readOnlyKeys: ["foo"],
            }
        );

        expect(conf.getValue("foo")).toBe("defaultA");

        expect(conf.setConfig("foo", "newA")).toBeFalsy();
        expect(conf.setConfig("bar", 20)).toBeTruthy();

        expect(conf.getValue("foo")).toBe("defaultA");
        expect(conf.getValue("bar")).toBe(20);
    });


    test("Setting a key as read-only prevents changes in user level", () => {
        const conf = new Configuration<TestConfig>(
            { foo: "defaultA", bar: 10 },
            {
                readOnlyKeys: ["foo"],
            }
        );

        expect(conf.getValue("foo")).toBe("defaultA");

        conf.setEnvironmentConfig({foo: "envA"});

        expect(conf.getValue("foo")).toBe("envA");

        conf.setUserConfig({foo: "userA", bar: 30});

        expect(conf.getValue("foo")).toBe("envA");
        expect(conf.getValue("bar")).toBe(30);

    });
});
