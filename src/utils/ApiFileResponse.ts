class ApiFileResponse {
    statusCode: number;
    data: any;
    message: string;
    success: boolean;

    constructor(statusCode: number, data: any, message = "Success") {
        this.statusCode = statusCode;
        this.data = this.toPlainObject(data);
        this.message = message;
        this.success = statusCode < 400;
    }

    private toPlainObject(value: any): any {
        if (value === null || value === undefined) return value;
        if (typeof value !== "object") return value;
        if (value instanceof Date) return value.toISOString();

        if (typeof value.toObject === "function") {
            return this.toPlainObject(value.toObject());
        }

        if (Array.isArray(value)) {
            return value.map((item) => this.toPlainObject(item));
        }

        const plain: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
            if (["$__", "mongoose", "schema", "client", "sessionPool"].includes(key)) continue;
            plain[key] = this.toPlainObject(val);
        }

        return plain;
    }
}

export default ApiFileResponse;