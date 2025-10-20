import { useEffect, useState } from "react";
import type { CategoryType } from "../types/types";
import { useStore } from "zustand";
import PopupFormStore from "../store/PopupFormStore";
import ColorDropdown from "../components/ColorDropdown";

function CreateCategoryForm({ setLoadPopup }: { setLoadPopup: (val: boolean) => void }) {
    const { args } = useStore(PopupFormStore);
    const { load } = args;

    const handleClick = () => {
        setLoadPopup(false);
    }

    return (
        <div className={`px-5 pb-5 grid relative place-items-center items-center duration-500 bg-white shadow-plum-secondary-sm rounded-xl ${!load ? 'scale-60' : 'scale-100'}`}>
            <div className="select-none w-fit flex items-center p-0.5 px-2.5 gap-x-1 font-cabin bg-plum-primary-dark text-plum-bg rounded-full -translate-y-1/2">
                <div className="h-3 w-3 mr-1 rounded-full bg-plum-bg"></div>
                <span className="font-semibold">Create</span>
                <span>Category</span>
            </div>
            <div className="grid relative w-55 items-center place-items-center gap-4 mt-5"> {/* <form>  */}
                <div className="flex gap-2 items-center w-full">
                    <div className="relative w-1/2 duration-400">
                        <label htmlFor="name" className="select-none absolute px-0.5 z-20 -top-3.5 left-3 bg-white text-plum-primary-dark duration-400">
                            Name
                        </label>
                        <div className="w-full border-2 z-0 relative border-plum-primary-dark rounded-full">
                            <input
                                id="name"
                                required
                                className="pl-3 p-1 w-full font-medium placeholder:font-normal placeholder:text-plum-surface placeholder:select-none bg-transparent outline-none focus:outline-none duration-400"
                                placeholder="Eg. Alert"
                            />
                        </div>
                    </div>
                    <div className="z-100 w-1/2">
                        <ColorDropdown />
                    </div>
                </div>

                <div className="relative w-full duration-400">
                    <label htmlFor="description" className="select-none absolute px-0.5 z-20 -top-3.5 left-3 bg-white text-plum-primary-dark duration-400">
                        Description
                    </label>
                    <div className="w-full border-2 z-0 relative border-plum-primary-dark rounded-full">
                        <input
                            id="description"
                            required
                            className="pl-3 p-1 w-full font-medium placeholder:font-normal placeholder:text-plum-surface placeholder:select-none bg-transparent outline-none focus:outline-none duration-400"
                            placeholder="Eg. Due, Urgent, etc"
                        />
                    </div>
                </div>

                <div></div>

                <div className="w-full flex gap-x-2 items-center mt-2">
                    <button className="w-full px-3 py-0.5 duration-300 select-none rounded-full cursor-pointer bg-none hover:bg-plum-bg-bold text-plum-secondary" onClick={() => { handleClick() }}>
                        Cancel
                    </button>
                    <button type="submit" className="w-full px-3 py-0.5 duration-150 rounded-full cursor-pointer font-semibold bg-plum-primary text-plum-bg" onClick={() => { handleClick() }}>
                        Create
                    </button>
                </div>
            </div> {/* </form>  */}
        </div>
    );
}

function EditCategoryForm({ setLoadPopup, category }: { setLoadPopup: (val: boolean) => void, category: CategoryType }) {
    return (
        <div className="h-20 w-20 bg-plum-secondary">

        </div>
    );
}

function FormPopup() {
    const { args, setArgs } = useStore(PopupFormStore);
    const { formType, load, category } = args;
    const [loadState, setLoadState] = useState(load);

    useEffect(() => {
        setLoadState(load);
    }, [load]);

    useEffect(() => {
        if (loadState === false) {
            setArgs({
                formType,
                load: false,
                category
            })
        }
    }, [loadState]);

    return (
        <div className={`
            w-screen max-w-screen fixed duration-300 ${loadState ? 'translate-y-0' : '-translate-y-full'}
            flex justify-center pt-7
        `}>
            {
                formType === 'create-category' ? <CreateCategoryForm setLoadPopup={setLoadState} /> : <EditCategoryForm setLoadPopup={setLoadState} category={category} />
            }
        </div>
    );
}

export default FormPopup;