import { ConfigurationError } from "./ConfigurationError";
import { ERRORCODES } from "./ERRORCODES";
import { ConfigValue, IConfigurationObject } from "./interfaces/IConfigurationObject";

/**
 * Options for the configuration instance
 */
interface IConfigurationOptions<T extends IConfigurationObject> {
    /**
     * Only create a single instance of Configuration in the application
     * Using this option will make the constructor return the same instance
     * every time it is called
     *
     * If multiple different configurations are needed, do not use this option!
     */
    singleton: boolean;

    backendUpdateFn?: (currentConfig: T) => Promise<Partial<T>>;

    backendUpdateIntervalMs: number;

    backendUpdateStartImmediate: boolean;
}

interface IListener<T extends IConfigurationObject> {
    id: string;
    keys: (keyof T)[];
    callback: (changedKeys: Partial<T>) => void;
}

export class Configuration<T extends IConfigurationObject> {
    private options: IConfigurationOptions<T> = {
        singleton: false,
        backendUpdateIntervalMs: 60000,
        backendUpdateStartImmediate: false,
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

    /**
     * Constructor
     * @param defaultConfig
     * @param options
     */
    constructor(defaultConfig: T, options: Partial<IConfigurationOptions<T>> = {}) {
        if (Configuration.instance && options.singleton) {
            return Configuration.instance;
        }

        this.options = { ...this.options, ...options };

        this.defaultConfig = defaultConfig;
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
            return this.config[key];
        }
        return undefined;
    }

    public static getValue<U extends IConfigurationObject>(key: keyof U): U[keyof U] | undefined {
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

    public static getConfigs<U extends IConfigurationObject>(): U {
        if (Configuration.instance && Configuration.instance.config) {
            return { ...Configuration.instance.config } as U;
        }
        throw new ConfigurationError(ERRORCODES.NO_CONFIGURATION_INSTANCE);
    }

    /**
     * Get a singleton instance of Configuration
     * @returns
     */
    public static getInstance<U extends IConfigurationObject>(
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
     */
    public setConfig(key: keyof T, value: ConfigValue) {
        this.dynamicConfig[key] = value as T[keyof T];
        this.changedKeysBuffer.add(key);
        this.buildConfig();
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
            this.environmentConfig = config;
            this.updateChangedKeysBufferWithPartialConfig(config, oldEnv);
        } else {
            this.environmentConfig = { ...this.environmentConfig, ...config };
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
            this.backendConfig = config;
            this.updateChangedKeysBufferWithPartialConfig(config, oldBackend);
        } else {
            this.backendConfig = { ...this.backendConfig, ...config };
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
        if (override === true) {
            const oldUser = { ...this.userConfig };
            this.userConfig = config;
            this.updateChangedKeysBufferWithPartialConfig(config, oldUser);
        } else {
            this.userConfig = { ...this.userConfig, ...config };
            this.updateChangedKeysBufferWithPartialConfig(config);
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
    // PRIVATE METHODS
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
                this.setBackendConfig(res);
            }
        } catch (error) {
            throw new ConfigurationError(ERRORCODES.BACKEND_UPDATE_FAILED, error as Error);
        }

        this.backendUpdateTimeout = setTimeout(() => {
            this.runBackendAutoUpdate();
        }, this.options.backendUpdateIntervalMs || 60000);
    }

    /**
     * Build the full configuration object by merging all configuration sources
     */
    private buildConfig(): void {
        this.config = {
            ...this.defaultConfig,
            ...this.environmentConfig,
            ...this.backendConfig,
            ...this.userConfig,
            ...this.dynamicConfig,
        } as T;
        this.backendConfig;

        this.triggerListeners();
    }

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
                    if (this.changedKeysBuffer.has(key)) {
                        relevantChanges[key] = this.config ? this.config[key] : undefined;
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
}
