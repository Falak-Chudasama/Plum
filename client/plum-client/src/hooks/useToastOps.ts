import ToastStore from "@/store/ToastStore";
import type { ToastType } from "@/types/types";

function add(id: string, alertType: ToastType, message: string) {
    const addToast = ToastStore.getState().addToast;

    addToast(message, alertType, id);
};

function remove() {

}

function reset() {

}

function get() {

}

const ops = {
    add,
    remove,
    reset,
    get
};

export default ops;