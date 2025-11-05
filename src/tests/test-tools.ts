import { Configuration } from "../Configuration.class";
import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";
import { IConfig, ConfigValue, IConfigurationObject } from "../interfaces/IConfigurationObject";

/**
 * Get the value (not the configuration object) for a specific key in a specific level.
 * @param conf 
 * @param key 
 * @param level 
 * @returns 
 */
export function getValueInLevel<T extends IConfig>(
    conf: Configuration<T>,
    key: keyof T,
    level: CONFIGLEVEL
): ConfigValue | undefined {
    const configs = conf.getConfigsForLevel(level);
    const val = configs[key];

    if (!val) {
        return undefined;
    }
    if (typeof val !== "object") {
        return val;
    }
    return val.value;
}

/**
 * Get the configuration object for a specific key in a specific level. If not an object or key is missing, returns undefined.
 * @param conf 
 * @param key 
 * @param level 
 * @returns 
 */
export function getConfigObjectInLevel<T extends IConfig>(
    conf: Configuration<T>,
    key: keyof T,
    level: CONFIGLEVEL
): IConfigurationObject | undefined {
    const configs = conf.getConfigsForLevel(level);
    const val = configs[key];

    if (!val || typeof val !== "object") {
        return undefined;
    }
    return val as IConfigurationObject;
}

/**
 * Get the current configuration object for a specific key.
 * 
 * @param conf 
 * @param key 
 * @returns 
 */
export function getCurrentConfigObject<T extends IConfig>(conf: Configuration<T>, key: keyof T): IConfigurationObject | undefined {
    const val = conf.getConfig(key);

    if (!val || typeof val !== "object") {
        return undefined;
    }
    return val as IConfigurationObject;
}
