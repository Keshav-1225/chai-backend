import path from "path";
import dotenv from "dotenv";
import connectDB from "./db/db.js";
import app from "./app.js";

dotenv.config({ path: path.join(process.cwd(), ".env") });

connectDB().then(
    () => {
        app.listen(process.env.PORT || 3000, () => {
            console.log(`http://localhost:${process.env.PORT}`);
        });
    }
).catch((error) => {
    console.log("Error while connecting database code with app code\n", error);
});


