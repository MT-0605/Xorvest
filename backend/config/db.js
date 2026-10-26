const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/xorvest";
    try {
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Warning: ${error.message}. Ensure your MONGODB_URI in .env is configured.`);
        throw error;
    }
};

module.exports = connectDB;
