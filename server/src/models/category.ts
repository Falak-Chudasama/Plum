import mongoose from "mongoose";

export const categorySchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    alert: {
        type: Boolean,
        default: false
    },
    color: {
        type: String,
        default: 'gray'
    }
});

const CategoryModel = mongoose.model('Category', categorySchema);

export default CategoryModel;