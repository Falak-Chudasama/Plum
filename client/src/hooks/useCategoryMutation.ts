import { useMutation, useQueryClient } from "@tanstack/react-query";
import apis from "../apis/apis";
import type { CategoryType } from "../types/types";

function useCreateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (category: CategoryType) => apis.createCategory(category),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        }
    });
}

function useEditCategory() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (category: CategoryType) => apis.editCategory(category),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        }
    });
}

function useDeleteCategory() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (category: CategoryType) => apis.deleteCategory(category),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        }
    });
}

const categoryMutations = {
    useCreateCategory,
    useEditCategory,
    useDeleteCategory
};

export default categoryMutations;