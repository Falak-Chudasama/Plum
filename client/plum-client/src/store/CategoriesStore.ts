import { create } from "zustand";
import { type CategoryType } from "../types/types";

type CategoryState = {
    category: CategoryType[],
    setCategory: (category: CategoryType[]) => void;
    removeCategory: () => void;
};

const CategoryStore = create<CategoryState>((set) => ({
    category: [],
    setCategory: (category) => { set({ category }) },
    removeCategory: () => { set({ category: [] }) }
}));

export default CategoryStore;