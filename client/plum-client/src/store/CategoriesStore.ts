import { create } from "zustand";
import { type Category } from "../types/types";

type CategoryState = {
    category: Category[],
    setCategory: (category: Category[]) => void;
    removeCategory: () => void;
};

const CategoryStore = create<CategoryState>((set) => ({
    category: [],
    setCategory: (category) => { set({ category }) },
    removeCategory: () => { set({ category: [] }) }
}));

export default CategoryStore;