import mongoose from "mongoose"

//mongoose.connect(process.env.MONGO_URI) may have many error so use in try catch

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDb connection error", error);
        process.exit(1)
    }
}

export default connectDB