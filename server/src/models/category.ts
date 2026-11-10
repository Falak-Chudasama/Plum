import mongoose from "mongoose";

export const categorySchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    alert: {
        type: Boolean,
        default: false
    },
    color: {
        type: String,
        default: '#B266E6'
    }
});

categorySchema.index({ email: 1, category: 1 }, { unique: true });

const CategoryModel = mongoose.model('Category', categorySchema);

export default CategoryModel;