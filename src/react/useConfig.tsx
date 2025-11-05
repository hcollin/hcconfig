import { useEffect, useState } from "react";
import { Configuration } from "../Configuration.class"; // adjust import as needed
import { ConfigValue, IConfig, IConfigurationObject } from "../interfaces/IConfigurationObject";
import { ConfigurationError } from "../ConfigurationError";
import { ERRORCODES } from "../enums/ERRORCODES";

export function useConfig<T extends IConfig>(configInstance: Configuration<T>, key: keyof T): [ConfigValue] {
    const [value, setValue] = useState<ConfigValue>(() => {
        const val = configInstance.getValue(key);
        if (val === undefined) {
            throw new ConfigurationError(ERRORCODES.UNKNOWN_CONFIG_KEY);
        }
        return val;
    });

    useEffect(() => {
        const unsubscribe = configInstance.subscribe([key], (changed) => {
            const val = changed[key] as ConfigValue;
            if (val !== undefined) {
                if (typeof val === "object" && val !== null) {
                    const oval = val as IConfigurationObject;
                    setValue(oval.value);
                    return;
                } else {
                    setValue(val);
                }
            }
        });
        return unsubscribe;
    }, [configInstance, key]);

    return [value];
}
