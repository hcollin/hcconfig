# 0.3.2

 - Removed a .only from a test suite

# 0.3.1

 - Fixed a bug useConfigs hook that did not return values that are falsy (like false, 0 etc.) and added tests for it

# 0.3.0

-   useConfig now returns set and clear functions within the tuple for making changes to the target configuration
-   useConfig value is now returned as primite string, number, boolean or null, not as ConfigValue type.

# 0.2.3

-   Still fixing publishing problems

# 0.2.2

-   package.json Changed the type to module and the path to types in export

# 0.2.1

-   First version of the Github Actions for building and deploying this library

# 0.2.0

-   React useConfig and useConfigs hooks

# 0.1.0

-   The Configuration now handles values internally as Objects with meta data in addition to just value.
-   readOnlyKeys option
    -   Prevents changes to configuration on USER and DYNAMIC levels

# 0.0.2

Included some tests for distributed files.

# 0.0.1

First initial version of the Configuration class
