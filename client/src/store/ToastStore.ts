import { create } from 'zustand';
import type { Toast, ToastType } from '@/types/types';

interface ToastStore {
    toasts: Toast[];
    addToast: (message: string, type: ToastType, id?: string) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

const ToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (message, type, id) => {
        const newToast: Toast = {
            id: id ?? Date.now().toString(),
            message,
            type
        }

        set(state => ({
            toasts: [...state.toasts, newToast]
        }));
    },

    removeToast: (id) => {
        set(state => ({
            toasts: state.toasts.filter((toast) => toast.id !== id)
        }));
    },

    clearToasts: () => {
        set({
            toasts: []
        })
    }
}));

export default ToastStore;