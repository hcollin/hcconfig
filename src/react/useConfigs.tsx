import { useEffect, useState } from "react";
import { Configuration } from "../Configuration.class"; // adjust import as needed
import { IConfig } from "../interfaces/IConfigurationObject";

export function useConfigs<T extends IConfig>(configInstance: Configuration<T>, keys?: (keyof T)[]): Partial<T> {
    const [values, setValues] = useState<Partial<T>>(() => {
        const targetKeys = keys && keys.length > 0 ? keys : configInstance.getKeys();

        return parseConfigToReactFormat(configInstance, targetKeys);
    });

    useEffect(() => {
        const targetKeys = keys && keys.length > 0 ? keys : configInstance.getKeys();
        const unsubscribe = configInstance.subscribe(targetKeys, (changed) => {
            setValues((prev: Partial<T>) => {
                for (const key in changed) {
                    const val = changed[key as keyof T];
                    if (val !== undefined) {
                        prev[key as keyof T] = Configuration.helperGetValue(val) as T[typeof key];
                    }
                }

                return prev;
            });
        });
        return unsubscribe;
    }, [configInstance, keys]);

    return values;
}

// Helper functions

function parseConfigToReactFormat<T extends IConfig>(configInstance: Configuration<T>, keys: (keyof T)[]): Partial<T> {
    return keys.reduce((acc, key) => {
        const val = configInstance.getValue(key);
        if (val !== undefined) {
            acc[key] = Configuration.helperGetValue(val) as T[typeof key];
        }

        return acc;
    }, {} as Partial<T>);
}
