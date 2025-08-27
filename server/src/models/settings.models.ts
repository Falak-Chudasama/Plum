import mongoose from "mongoose";

export const settingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: String,
        required: true,
        unique: true
    }
});

const SettingsModel = mongoose.model('Settings', settingsSchema);
export default SettingsModel;