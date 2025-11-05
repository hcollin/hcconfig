
export const ERRORCODES = {
    UNKNOWN_CONFIG_KEY: "The specified configuration key does not exist.",
    DEFAULTCONFIG_MUST_BE_OBJECT: "Default configuration must be an object extending IConfigurationObject.",
    INSTANCE_NEEDS_DEFAULTCONFIGS: "Default configuration must be provided for the first instantiation of singleton Configuration.",
    NO_CONFIGURATION_INSTANCE: "No Configuration instance exists. Please create one before accessing it.",
    NO_BACKEND_UPDATE_FN: "No backend update function provided for dynamic backend updates.",
    BACKEND_UPDATE_FAILED: "Backend update function failed to fetch new configuration.",
    CONFIGURATIONS_NOT_BUILT_YET: "Configurations have not been built yet.",
    UNKNOWN_CONFIG_LEVEL: "The specified configuration level is unknown.",
    INVALID_CONFIG_TYPE: "The configuration value is of an invalid type. Expected string, number, boolean, or null.",

}