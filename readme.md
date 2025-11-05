# Configuration library

![Build Status](https://github.com/hcollin/hcconfig/actions/workflows/build.yml/badge.svg) ![npm version](https://img.shields.io/npm/v/hcconfig) ![License](https://img.shields.io/github/license/hcollin/hcconfig) ![Last Commit](https://img.shields.io/github/last-commit/hcollin/hcconfig)

Configuration class with multiple levels of configurations.

# Installing

Installing

```
npm install hconfig
```

_Notice!_ To use the provided react hooks, React 19 needs to be installed.

# Usage

```ts
new Configuration<T extends IConfig>(T, optionsObject);
```

## Creating configuration format

First we need to define a configuration interface that extends the `IConfig` interface exported by the library. This configuration interface should be in a separate file exported out so that in can be used around the project.

```typescript src/IAppConfig.ts
import { IConfig } from "hcconfig";

export interface IAppConfig extends IConfig {
    foo: string;
    ready: boolean;
    counter: number;
}
```

## New configuration instance

The we need to create an instance of the Configuration class. This should also be in a separate file from the main app so that in can be imported. If you only need one configuration file, which is the typical case, this configuration instance be created as a singleton.

First the non singleton version of the configuration:

```ts src/appConfig.ts
import { Configuration } from "hcconfig";
import { IAppConfig } from "./IAppConfig.ts";

const appConfig = new Configuration<IAppConfig>(
    {
        foo: "value",
        ready: false,
        counter: 0,
    },
    { singleton: false }
);

export appConfig;
```

## Getting values from instance

_Notice!_ Examples below all expect that an instance of **Configuration** class is created and available with name `appConfig`.

The simplest way to get a value from the configuration is to use the `getValue()` function. This will return the current value of the provided key. If the key is not valid key of the Configuration interface, this will throw a `ConfigurationError`.

```ts
const foo = getValue("foo"); // Returns "value"
```

You can also get the full **ConfigurationObject** that includes some metadata like at which configuration level this value set.

```ts
const foo = getConfig("foo"); // Returns { value: "value", readonly: false, level: "default" }
```

## Changing configurations

### Setting dynamic values

Only dynamic values should be modified at runtime with `setConfig(key, value)` function. If the key is included in **readOnlyKeys** option, it cannot be set on runtime.

```ts
conf.setConfig("foo", "newValue");
```

# Configuration levels

The **Configuration** class can hold configurations on five levels:

1.  DEFAULT
2.  ENVIRONMENT
3.  BACKEND
4.  USER
5.  DYNAMIC

The default level must contain some value for each key in the Configuration interface. ALl the others contain only those values that differ from the those below.

The final configuration is parsed in the same order as they are shown on the list. This means that if key _foo_ is set to value **value** in the defaults, but the ENVIRONMENT level sets it to **envValue** the `getConfig(foo);` will return **envValue**.

## Level: Default

The **Default** level contains the initial, hardcoded values for every key defined in your configuration interface. These values act as the root configuration and must be provided for all keys. Other levels (environment, backend, user, dynamic) can override these defaults, but if a key is not set at a higher level, the default value is used. This ensures your configuration always has a complete set of values to fall back on.

The default level is provided when the Configuration instance is created as the first argument to the constructor method.

## Level: Environemnt

The **Environment** is intended use case is to override default configuration values using environment-specific settings, such as those loaded from environment variables or configuration files. This is useful for adapting your application to different deployment contexts (development, staging, production, etc.) without making changes to the default configurations.

The **Configuration** does not read env files automatically and the actual configuration nees to be passed with `setEnvironmentConfig()` function.

```ts
const c = new Configuration<IAppConfig>(
    {
        foo: "value",
        ready: false,
        number: 0,
    },
    {}
);

c.setEnvironmentConfig({
    ready: true,
});
```

## Level: Backend

The **Backend** level allows your configuration to be updated automatically from a backend source, such as a remote API or database. When creating the Configuration instance, you can provide an `updateFunction` and an `interval` in the options object. The `updateFunction` should return a partial configuration object, and the Configuration class will periodically call this function at the specified interval (in milliseconds), applying any changes to the backend configuration level.

This is useful for scenarios where your application needs to react to configuration changes managed centrally or externally, without manual intervention.

Example usage:

```ts
import { Configuration } from "hcconfig";
import { IAppConfig } from "./IAppConfig.ts";

// Example backend update function
async function fetchBackendConfig(currentConfig: IAppConfig): Promise<Partial<IAppConfig>> {
    // Fetch config from backend API
    const response = await fetch("/api/config");
    return await response.json();
}

const appConfig = new Configuration<IAppConfig>(
    {
        foo: "value",
        ready: false,
        counter: 0,
    },
    {
        singleton: true, // Only one instance in the app
        backendUpdateFn: fetchBackendConfig, // Function to fetch backend config
        backendUpdateIntervalMs: 60000, // Update every 60 seconds
        backendUpdateStartImmediate: true, // Start update immediately on instantiation
    }
);
```

With this setup, the configuration will automatically refresh the backend level values every minute, ensuring your app stays up-to-date with remote changes.

## Level: User

The **User** level allows configuration values to be set by the end user, typically through UI controls or user preferences. These settings override values from the default, environment, and backend levels, but cannot override keys marked as readonly in the configuration options.

To set user-level configuration values, use the `setUserConfig()` function. This function accepts a partial configuration object and applies the changes to the user level, provided the keys are not readonly.

Example usage:

```ts
appConfig.setUserConfig({
    foo: "userValue",
    counter: 42,
});
```

Readonly keys defined in the configuration options cannot be changed at the user level. Attempting to set a readonly key will result in a `ConfigurationError`.

User-level settings are useful for personalizing the application experience for individual users, while still respecting global and environment-specific constraints. They can also be stored in to separate backend api, authentication provider or maybe even to localStorage.

## Level: Dynamic

The **Dynamic** level is designed for temporary, session-based configuration changes that are not persisted. These values are intended for use cases where configuration needs to be adjusted on the fly, such as during a user session or in response to runtime events. Dynamic configurations override all other levels (default, environment, backend, user) for their respective keys, but are not saved to any storage or backend.

To set a dynamic configuration value, use the `setConfig(key, value)` method. This immediately updates the configuration for the specified key at the dynamic level:

```ts
appConfig.setConfig("foo", "sessionValue");
```

Dynamic values are ideal for scenarios where you need to temporarily override a configuration without affecting persistent settings. For example, you might use dynamic configs to enable a feature for the current session, run experiments, or respond to real-time events. Once the session ends or the value is deleted, the configuration falls back to the next available level.

To remove a dynamic configuration and revert to the previous value, use:

```ts
appConfig.deleteConfig("foo");
```

Dynamic configurations are not persisted and will be lost when the application restarts or the session ends.