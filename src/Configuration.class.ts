import { read } from "fs";
import { ConfigurationError } from "./ConfigurationError";
import { CONFIGLEVEL } from "./enums/CONFIGLEVEL";
import { ERRORCODES } from "./enums/ERRORCODES";
import { ConfigValue, IConfig, IConfigurationObject } from "./interfaces/IConfigurationObject";

/**
 * Options for the configuration instance
 */
interface IConfigurationOptions<T extends IConfig> {

    /**
     * Only create a single instance of Configuration in the application
     * Using this option will make the constructor return the same instance
     * every time it is called
     *
     * If multiple different configurations are needed, do not use this option!
     */
    singleton: boolean;

    /**
     * Backend update function that will be called periodically to fetch new configuration values
     * @param currentConfig 
     * @returns 
     */
    backendUpdateFn?: (currentConfig: T) => Promise<Partial<T>>;

    /**
     * Interval in milliseconds for backend updates
     */
    backendUpdateIntervalMs: number;

    /**
     * Make the backend update run immediately upon class instantiation
     */
    backendUpdateStartImmediate: boolean;

    /**
     * Keys that should be set to read-only and cannot be overridden by user or dynamic configurations
     */
    readOnlyKeys: (keyof T)[];
}

interface IListener<T extends IConfig> {
    id: string;
    keys: (keyof T)[];
    callback: (changedKeys: Partial<T>) => void;
}

/**
 * Configuration class to manage application configurations on multiple levels
 */
export class Configuration<T extends IConfig> {
    private options: IConfigurationOptions<T> = {
        singleton: false,
        backendUpdateIntervalMs: 60000,
        backendUpdateStartImmediate: false,
        readOnlyKeys: [],
    };

    private static instance: Configuration<any> | null = null;

    /**
     * Default configuration values are provided during the construction
     * of the Configuration instance and are immutable after that.
     */
    private readonly defaultConfig: T = {} as T;

    /**
     * Environmental configurations values
     */
    private environmentConfig: Partial<T> = {};

    /**
     * Backend configuration values are stored here
     */
    private backendConfig: Partial<T> = {};

    /**
     * User configuration values are stored here
     */
    private userConfig: Partial<T> = {};

    /**
     * Dynamic configuration values are temporary and will not be stored anywhere;
     */
    private dynamicConfig: Partial<T> = {};

    private changedKeysBuffer: Set<keyof T> = new Set();

    /**
     * Current full configuration object
     *
     * The buildConfig() targets this property
     */
    private config: T | null = null;

    /**
     * Listeners subscribed to configuration changes
     */
    private listeners: IListener<T>[] = [];

    /**
     * Backend update timeout for dynamic backend updates
     */
    private backendUpdateTimeout: NodeJS.Timeout | null = null;

    //=============================================================================
    // CONSTRUCTOR
    //=============================================================================

    /**
     * Constructor
     *
     * @param defaultConfig
     * @param options
     */
    constructor(defaultConfig: T, options: Partial<IConfigurationOptions<T>> = {}) {
        if (Configuration.instance && options.singleton) {
            return Configuration.instance;
        }

        this.options = { ...this.options, ...options };

        this.defaultConfig = this.buildDefaultValues(defaultConfig);
        this.buildConfig();

        if (this.options.singleton) {
            Configuration.instance = this;
        }

        if (this.options.backendUpdateFn && this.options.backendUpdateStartImmediate) {
            this.runBackendAutoUpdate();
        }
    }

    //=============================================================================
    // PUBLIC: Getting configuration values
    //=============================================================================

    /**
     * Get a single configuration value by its key
     *
     * @param key
     * @returns
     */
    public getValue(key: keyof T): T[keyof T] | undefined {
        if (this.config) {
            if (!this.config.hasOwnProperty(key)) {
                return undefined;
            }

            const conf = this.config[key];

            if (typeof conf === "object") {
                const confObj = conf as IConfigurationObject;
                return confObj.value as T[keyof T];
            }

            return this.config[key];
        }
        return undefined;
    }

    /**
     * Get a ConfigValue that can should always be a shallowcopy of the internal configuration object
     * @param key
     * @returns
     */
    public getConfig(key: keyof T): ConfigValue | undefined {
        if (!this.config) {
            throw new ConfigurationError(ERRORCODES.CONFIGURATIONS_NOT_BUILT_YET);
        }
        if (typeof this.config[key] === "object") {
            return { ...this.config[key] };
        }
        return this.config[key];
    }

    public static getValue<U extends IConfig>(key: keyof U): U[keyof U] | undefined {
        if (Configuration.instance && Configuration.instance.config) {
            return Configuration.instance.getValue(key);
        }
        throw new ConfigurationError(ERRORCODES.NO_CONFIGURATION_INSTANCE);
    }

    /**
     * Return a shallowcopy of the full configuration object
     *
     * @returns
     */
    public getConfigs(): T {
        if (this.config) {
            return { ...this.config };
        }
        throw new ConfigurationError("Configuration has not been built yet.");
    }

    public getConfigsForLevel(level: CONFIGLEVEL): Partial<T> {
        if (!this.config) {
            throw new ConfigurationError(ERRORCODES.CONFIGURATIONS_NOT_BUILT_YET);
        }

        switch (level) {
            case CONFIGLEVEL.DEFAULT:
                return { ...this.defaultConfig };
            case CONFIGLEVEL.ENVIRONMENT:
                return { ...this.environmentConfig };
            case CONFIGLEVEL.BACKEND:
                return { ...this.backendConfig };
            case CONFIGLEVEL.USER:
                return { ...this.userConfig };
            case CONFIGLEVEL.DYNAMIC:
                return { ...this.dynamicConfig };
        }
    }

    public static getConfigs<U extends IConfig>(): U {
        if (Configuration.instance && Configuration.instance.config) {
            return { ...Configuration.instance.config } as U;
        }
        throw new ConfigurationError(ERRORCODES.NO_CONFIGURATION_INSTANCE);
    }

    /**
     * Get a singleton instance of Configuration
     * @returns
     */
    public static getInstance<U extends IConfig>(
        defaultConfig?: U,
        options?: IConfigurationOptions<U>
    ): Configuration<U> {
        if (Configuration.instance === null) {
            if (!defaultConfig) {
                throw new ConfigurationError(ERRORCODES.INSTANCE_NEEDS_DEFAULTCONFIGS);
            }
            Configuration.instance = new Configuration<U>(defaultConfig || ({} as U), { ...options, singleton: true });
        }
        return Configuration.instance as Configuration<U>;
    }

    public static clearInstance(): void {
        Configuration.instance = null;
    }

    /**
     * Subscribe to configuration changes for specific keys. Returns an unsubscribe function.
     *
     * @param keys
     * @param callback
     * @returns
     */
    public subscribe(keys: (keyof T)[] | keyof T, callback: (changedKeys: Partial<T>) => void): () => void {
        const id = `listener-id-${this.listeners.length}-${Math.round(Math.random() * 10000)}`;
        const listener: IListener<T> = { id, keys: Array.isArray(keys) ? keys : [keys], callback };
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l.id !== id);
        };
    }

    //=============================================================================
    // PUBLIC: Setting new configuration values
    //=============================================================================

    /**
     * Sets a dynamic configuration value
     *
     * @param key
     * @param value
     * @return boolean indicating if the value was set (false if the key is read-only)
     */
    public setConfig(key: keyof T, value: ConfigValue): boolean {
        if (!this.config) {
            throw new ConfigurationError(ERRORCODES.CONFIGURATIONS_NOT_BUILT_YET);
        }

        const conf = this.getConfig(key);

        if (!conf) {
            throw new ConfigurationError(ERRORCODES.UNKNOWN_CONFIG_KEY);
        }

        // If this key is read-only, do not allow setting it
        if (this.options.readOnlyKeys.includes(key)) {
            return false;
        }

        if (conf && typeof conf === "object") {
            const confObj = { ...conf } as IConfigurationObject;
            confObj.value = value as T[keyof T];

            if (conf.level === CONFIGLEVEL.DEFAULT) {
                confObj.readonly = true;
            }

            confObj.level = CONFIGLEVEL.DYNAMIC;

            confObj.readonly = false;
            this.dynamicConfig[key] = { ...confObj } as T[keyof T];
        } else {
            const newConfObj: IConfigurationObject = {
                value: value as T[keyof T],
                level: CONFIGLEVEL.DYNAMIC,
            };
            this.dynamicConfig[key] = { ...newConfObj } as T[keyof T];
        }

        this.changedKeysBuffer.add(key);
        this.buildConfig();
        return true;
    }

    /**
     * Delete a dynamic configuration value
     *
     * @param key
     */
    public deleteConfig(key: keyof T): void {
        delete this.dynamicConfig[key];
        this.changedKeysBuffer.add(key);
        this.buildConfig();
    }

    /**
     * Set or update environment configuration values. By default, new values
     * are merged with existing ones. If `override` is true, existing values
     * are replaced entirely.
     *
     * @param config
     * @param override
     */
    public setEnvironmentConfig(config: Partial<T>, override?: boolean) {
        if (override === true) {
            const oldEnv = { ...this.environmentConfig };
            this.environmentConfig = this.buildConfigurationObjects(config, CONFIGLEVEL.ENVIRONMENT) as Partial<T>;
            this.updateChangedKeysBufferWithPartialConfig(config, oldEnv);
        } else {
            this.environmentConfig = {
                ...this.environmentConfig,
                ...this.buildConfigurationObjects(config, CONFIGLEVEL.ENVIRONMENT),
            };
            this.updateChangedKeysBufferWithPartialConfig(config);
        }

        this.buildConfig();
    }

    /**
     * Set or update backend configuration values. By default, new values
     * are merged with existing ones. If `override` is true, existing values
     * are replaced entirely.
     *
     * @param config
     * @param override
     */
    public setBackendConfig(config: Partial<T>, override?: boolean) {
        if (override === true) {
            const oldBackend = { ...this.backendConfig };
            this.backendConfig = this.buildConfigurationObjects(config, CONFIGLEVEL.BACKEND) as Partial<T>;
            this.updateChangedKeysBufferWithPartialConfig(config, oldBackend);
        } else {
            this.backendConfig = {
                ...this.backendConfig,
                ...this.buildConfigurationObjects(config, CONFIGLEVEL.BACKEND),
            };
            this.updateChangedKeysBufferWithPartialConfig(config);
        }
        this.buildConfig();
    }

    /**
     * Set or update user configuration values. By default, new values
     * are merged with existing ones. If `override` is true, existing values
     * are replaced entirely.
     *
     * @param config
     * @param override
     */
    public setUserConfig(config: Partial<T>, override?: boolean) {
        // Filter out all read-only keys from the provided config
        const filteredConfig: Partial<T> = Object.keys(config).reduce((acc, key) => {
            if (!this.options.readOnlyKeys.includes(key as keyof T)) {
                acc[key as keyof T] = config[key as keyof T];
            }
            return acc;
        }, {} as Partial<T>);

        if (override === true) {
            const oldUser = { ...this.userConfig };
            this.userConfig = this.buildConfigurationObjects(filteredConfig, CONFIGLEVEL.USER) as Partial<T>;
            this.updateChangedKeysBufferWithPartialConfig(filteredConfig, oldUser);
        } else {
            this.userConfig = { ...this.userConfig, ...this.buildConfigurationObjects(filteredConfig, CONFIGLEVEL.USER) };
            this.updateChangedKeysBufferWithPartialConfig(filteredConfig);
        }
        this.buildConfig();
    }

    //=============================================================================
    // PUBLIC: Backend auto-update controls
    //=============================================================================

    /**
     * Start the backend auto-update process
     */
    public async startBackendAutoUpdate(): Promise<boolean> {
        // If no backend update function is provided, throw an error
        if (this.options.backendUpdateFn === undefined) {
            throw new ConfigurationError(ERRORCODES.NO_BACKEND_UPDATE_FN);
        }

        // If already running, do nothing
        if (this.backendUpdateTimeout !== null && this.options.backendUpdateFn !== undefined) {
            return true;
        }

        // Start the update process now if update function is provided
        if (this.options.backendUpdateFn !== undefined) {
            await this.runBackendAutoUpdate();
            return true;
        }

        return false;
    }

    /**
     * Stop the backend auto-update process
     */
    public stopBackendAutoUpdate(): void {
        if (this.backendUpdateTimeout) {
            clearTimeout(this.backendUpdateTimeout);
            this.backendUpdateTimeout = null;
        }
    }

    //=============================================================================
    // PRIVATE METHODS: Building and managing configurations
    //=============================================================================

    /**
     * Build the full configuration object by merging all configuration sources
     */
    private buildConfig(): void {
        this.config = {
            ...this.buildDefaultValues(this.defaultConfig),
            ...this.buildConfigurationObjects(this.environmentConfig, CONFIGLEVEL.ENVIRONMENT),
            ...this.buildConfigurationObjects(this.backendConfig, CONFIGLEVEL.BACKEND),
            ...this.buildConfigurationObjects(this.userConfig, CONFIGLEVEL.USER),
            ...this.buildConfigurationObjects(this.dynamicConfig, CONFIGLEVEL.DYNAMIC),
        } as T;
        this.resetReadOnlyFlags();
        this.triggerListeners();
    }

    /**
     * Build default configuration values into IConfigurationObject entries
     *
     * This is a separate method as the default configuration must contain all keys of T not just Partial<T>
     * @param conf
     * @returns
     */
    private buildDefaultValues(conf: T): T {
        const defaults: T = this.buildConfigurationObjects(conf, CONFIGLEVEL.DEFAULT) as T;
        return defaults;
    }

    /**
     * Convert a IConfig object with direct values into one with IConfigurationObject entries
     * @param conf
     * @param level
     * @returns
     */
    private buildConfigurationObjects(conf: Partial<T>, level: CONFIGLEVEL): Partial<T> {
        const builtConfig: Partial<T> = {};
        Object.keys(conf).forEach((key) => {
            const val = conf[key as keyof T];

            if (typeof val === "object") {
                const valObj = val as IConfigurationObject;
                valObj.level = level;
                builtConfig[key as keyof T] = valObj as unknown as T[keyof T];
            } else {
                builtConfig[key as keyof T] = {
                    value: conf[key as keyof T],
                    readonly: this.options.readOnlyKeys.includes(key as keyof T),
                    level,
                } as unknown as T[keyof T];
            }
        });
        return builtConfig;
    }

    /**
     * Mark those configs to read-only that are specified in the options
     */
    private resetReadOnlyFlags(): void {
        if (!this.config) {
            throw new ConfigurationError(ERRORCODES.CONFIGURATIONS_NOT_BUILT_YET);
        }
        Object.keys(this.config).forEach((key) => {
            if (!this.config) {
                throw new ConfigurationError(ERRORCODES.CONFIGURATIONS_NOT_BUILT_YET);
            }
            const val = this.config[key as keyof T];

            if (this.options.readOnlyKeys.includes(key as keyof T)) {
                if (typeof val === "object") {
                    const valObj = val as IConfigurationObject;
                    valObj.readonly = true;
                    this.config[key as keyof T] = valObj as unknown as T[keyof T];
                }
            }
        });
    }

    //=============================================================================
    // PRIVATE: Backend auto-update methods
    //=============================================================================

    /**
     * Run the backend update function to fetch new configuration values
     */
    private async runBackendAutoUpdate(): Promise<void> {
        if (!this.options.backendUpdateFn) {
            throw new ConfigurationError(ERRORCODES.NO_BACKEND_UPDATE_FN);
        }
        if (this.backendUpdateTimeout) {
            clearTimeout(this.backendUpdateTimeout);
        }

        try {
            const res = await this.options.backendUpdateFn({ ...this.config } as T);

            if (res && Object.keys(res).length > 0) {
                this.setBackendConfig(res, true);
            }
        } catch (error) {
            throw new ConfigurationError(ERRORCODES.BACKEND_UPDATE_FAILED, error as Error);
        }

        this.backendUpdateTimeout = setTimeout(() => {
            this.runBackendAutoUpdate();
        }, this.options.backendUpdateIntervalMs || 60000);
    }

    //=============================================================================
    // PRIVATE: Subscriber management methods
    //=============================================================================

    /**
     * Update the changed keys buffer with keys from a partial configuration object.
     *
     * If the old configuration is provided, keys that were removed are also added to the buffer.
     * @param newConf
     * @param oldConf
     */
    private updateChangedKeysBufferWithPartialConfig(newConf: Partial<T>, oldConf?: Partial<T>): void {
        Object.keys(newConf).forEach((key) => {
            this.changedKeysBuffer.add(key as keyof T);
            if (oldConf && !(key in newConf)) {
                this.changedKeysBuffer.add(key as keyof T);
            }
        });
    }

    /**
     * Trigger all listeners with the changed keys in the buffer and clear the buffer
     * @param changedKeys
     */
    private triggerListeners(): void {
        if (this.config === null) {
            return;
        }

        // Notify all listeners about the changed keys
        this.listeners.forEach((listener) => {
            // If no keys are specified, notify for all keys and provide the full config
            if (listener.keys.length === 0) {
                if (this.config === null) return;
                listener.callback(this.config);
                return;
            }

            const relevantChanges: Partial<T> = {};

            // Check if any of the listener's keys are in the changed keys buffer
            if (listener.keys.length > 0) {
                listener.keys.forEach((key) => {
                    if (!this.config) return;
                    if (this.changedKeysBuffer.has(key)) {
                        const val = this.config[key];

                        relevantChanges[key] = val;
                    }
                });
            }

            if (Object.keys(relevantChanges).length > 0) {
                listener.callback(relevantChanges);
            }
        });

        // Clear the buffer after notifying listeners
        this.changedKeysBuffer.clear();
    }

    //=============================================================================
    // STATIC PURE HELPER METHODS FOR EXTERNAL USAGE
    //=============================================================================

    public static helperSetValue(original: ConfigValue, newValue: string | number | boolean): ConfigValue {
        if (original && typeof original === "object") {
            return {
                ...original,
                value: newValue as ConfigValue,
            };
        }

        return newValue as ConfigValue;
    }

    public static helperGetValue(original: ConfigValue): string | number | boolean | undefined {
        if (original && typeof original === "object") {
            const origObj = original as IConfigurationObject;
            if (
                typeof origObj.value !== "string" &&
                typeof origObj.value !== "number" &&
                typeof origObj.value !== "boolean"
            ) {
                return undefined;
            }
            return origObj.value as string | number | boolean;
        }
        return original as string | number | boolean;
    }

    public static helperConvertToValueObject<T>(config: Partial<T>): Partial<T> {
        return Object.keys(config).reduce((acc, key) => {
            const val = config[key as keyof T];
            if (val && typeof val === "object") {
                const vobj = val as unknown as IConfigurationObject;
                acc[key as keyof T] = vobj.value as T[keyof T];
            } else {
                acc[key as keyof T] = val;
            }
            return acc;
        }, {} as Partial<T>);
    }
}
