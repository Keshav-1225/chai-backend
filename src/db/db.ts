import dns from "dns";
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

async function resolveSrvRecords(hostname: string) {
    try {
        const records = await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
        console.log("SRV records resolved:", records);
        return records;
    } catch (error) {
        console.warn("Initial SRV resolution failed:", (error as Error).message);
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        console.log("Retrying SRV resolution with public DNS servers...");
        const records = await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
        console.log("SRV records resolved with fallback DNS:", records);
        return records;
    }
}

async function connectDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error("Missing required environment variable: MONGODB_URI");
        process.exit(1);
    }

    const srvMatch = uri.match(/^mongodb\+srv:\/\/[A-Za-z0-9_-]+:[^@]+@([^/]+)(?:\/.*)?$/);
    if (srvMatch) {
        await resolveSrvRecords(srvMatch[1]);
    }

    try {
        const connectionInstance = await mongoose.connect(uri, {
            dbName: DB_NAME,
        });
        console.log("DB Connection established!!");
        console.log(`DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("Error while connecting to database:\n", error);
        process.exit(1);
    }
}

export default connectDB