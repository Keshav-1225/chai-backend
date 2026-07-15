import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_KEY = process.env.CLOUDINARY_CLOUD_KEY;
const CLOUD_SECRET = process.env.CLOUDINARY_CLOUD_SECRET;

function mask(s?: string) {
    if (!s) return undefined;
    return s.length > 4 ? `${s.slice(0, 2)}...${s.slice(-2)}` : s;
}

const isCloudinaryConfigured = Boolean(CLOUD_NAME && CLOUD_KEY && CLOUD_SECRET);

if (!isCloudinaryConfigured) {
    console.warn("Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_CLOUD_KEY, and CLOUDINARY_CLOUD_SECRET in .env");
} else {
    console.info(`Configuring Cloudinary: cloud_name=${CLOUD_NAME}, api_key=${mask(CLOUD_KEY)}`);
    cloudinary.config({
        cloud_name: CLOUD_NAME,
        api_key: CLOUD_KEY,
        api_secret: CLOUD_SECRET
    });
}

type CloudinaryUploadResult = {
    url: string;
    secure_url?: string;
    public_id?: string;
};

const removeLocalFile = (absolutePath: string) => {
    if (!fs.existsSync(absolutePath)) return;

    try {
        fs.unlinkSync(absolutePath);
    } catch {
        // Ignore temp-file cleanup failures.
    }
};

const uploadOnCloudinary = async (localFilePath: string): Promise<CloudinaryUploadResult> => {
    if (!localFilePath) throw new Error("File path not found");
    if (!isCloudinaryConfigured) throw new Error("Cloudinary credentials are missing or incomplete");

    const absolutePath = path.resolve(process.cwd(), localFilePath);
    if (!fs.existsSync(absolutePath)) throw new Error("File not found");

    try {
        const response = await cloudinary.uploader.upload(absolutePath, {
            resource_type: "auto",
        });

        const uploadedUrl = response.secure_url || response.url;
        if (!uploadedUrl) {
            throw new Error("Cloudinary upload succeeded but no asset URL was returned");
        }

        console.log("Cloudinary upload succeeded:", response.public_id);

        return {
            url: uploadedUrl,
            secure_url: response.secure_url,
            public_id: response.public_id
        };
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        throw error;
    } finally {
        removeLocalFile(absolutePath);
    }
};

export { uploadOnCloudinary };
