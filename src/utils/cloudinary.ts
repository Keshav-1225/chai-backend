import { v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config(
     {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_CLOUD_KEY,
        api_secret: process.env.CLOUDINARY_CLOUD_SECRET
     }
)

const uploadOnCloudinary = async (localFilePath:string) => {
    try {
        if(!localFilePath) throw new Error("File Path not Found")
        
            // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type: "auto"})
        
        // File has been uploaded successfully
        console.log("File has been uploaded successfully");
        console.log(response.url);
        return response
    
    } catch (error) {
        fs.unlinkSync(localFilePath)    //remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

export {uploadOnCloudinary}