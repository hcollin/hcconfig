export type ConfigValue = string | number | boolean | IConfigurationObjectLeaf;

export interface IConfigurationObject {
    [key: string]: ConfigValue;
}

export interface IConfigurationObjectLeaf {
    [key: string]: ConfigValue;
}
