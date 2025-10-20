import { create } from "zustand";

type dataType = {
    name: string,
    color: string,
    description: string,
    alert: boolean
};

type CreateCatDataState = {
    data: dataType,
    setData: (data: dataType) => void,
    resetData: () => void
};

const CreateCatDataStore = create<CreateCatDataState>((set) => ({
    data: {
        name: '',
        color: 'gray',
        description: '',
        alert: false,
    },
    setData: (data) => { set({ data }) },
    resetData: () => { set({
        data: {
            name: '',
            color: 'gray',
            description: '',
            alert: false,
        }
    }) }
}));

export default CreateCatDataStore;