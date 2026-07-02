class ApiError extends Error {
    statusCode: number;
    data: null;
    success: boolean;
    errors: unknown[];
    constructor(
        statusCode: number,
        message = "Something went wrong",
        success: boolean = false,
        errors: unknown[] = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = success
        this.errors = errors

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export {ApiError}