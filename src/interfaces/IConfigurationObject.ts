import { CONFIGLEVEL } from "../enums/CONFIGLEVEL";

export type ConfigValue = string | number | boolean | IConfigurationObject;

/**
 * The main configuration interface representing a collection of configuration keys and their values.
 */
export interface IConfig {
    [key: string]: ConfigValue;
}

/**
 * An extended configuration interface that includes meta data about each configuration value.
 * 
 * Used internally by the Configuration class to track the source level of each configuration entry.
 */
export interface IConfigurationObject {
    value: ConfigValue;
    level: CONFIGLEVEL;
    readonly?: boolean;
    
}
