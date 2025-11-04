

export class ConfigurationError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = "ConfigurationError";
        if (cause) {
            this.stack = cause.stack;
        }
    }
}