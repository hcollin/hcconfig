import { useCallback, useEffect, useState } from "react";
import { Configuration } from "../Configuration.class"; // adjust import as needed
import { ConfigValue, IConfig, IConfigurationObject } from "../interfaces/IConfigurationObject";
import { ConfigurationError } from "../ConfigurationError";
import { ERRORCODES } from "../enums/ERRORCODES";

/**
 * Custom hook to access and manipulate a single configuration value from a Configuration instance.
 *
 * Usage:
 * const [value, setValue, clearValue] = useConfig<IMyConfig>(configInstance, "targetKey");
 *
 * The value is automatically updated when the configuration changes and is returned as a primitive type (string, number, boolean, or null).
 *
 * @param configInstance Configuration class instance with the desired configuration and default values at the minimum
 * @param key The target configuration key we are interested in
 * @returns A tuple containing the current value, a setter function, and a clear function
 */
export function useConfig<T extends IConfig>(
    configInstance: Configuration<T>,
    key: keyof T
): [string | number | boolean | null, (val: ConfigValue) => void, () => void] {
    const [value, setValue] = useState<string | number | boolean | null>(() => {
        const val = configInstance.getValue(key);
        if (typeof val === "object" && val.value !== undefined) {
            const oval = val as IConfigurationObject;
            return oval.value as string | number | boolean | null;
        }
        if (val === undefined) {
            throw new ConfigurationError(ERRORCODES.UNKNOWN_CONFIG_KEY);
        }
        if (typeof val !== "string" && typeof val !== "number" && typeof val !== "boolean" && val !== null) {
            throw new ConfigurationError(ERRORCODES.INVALID_CONFIG_TYPE);
        }
        return val as string | number | boolean | null;
    });

    useEffect(() => {
        const unsubscribe = configInstance.subscribe([key], (changed) => {
            const val = changed[key] as ConfigValue;
            if (val !== undefined) {
                if (typeof val === "object" && val !== null) {
                    const oval = val as IConfigurationObject;
                    setValue(oval.value as string | number | boolean | null);
                    return;
                } else {
                    setValue(val as string | number | boolean | null);
                }
            }
        });
        return unsubscribe;
    }, [configInstance, key]);

    const setConfigCallback = useCallback(
        (val: ConfigValue) => {
            configInstance.setConfig(key, val);
        },
        [configInstance, key]
    );

    const clearValue = useCallback(() => {
        configInstance.deleteConfig(key);
    }, [configInstance, key]);

    return [value, setConfigCallback, clearValue];
}
