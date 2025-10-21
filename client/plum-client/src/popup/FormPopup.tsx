import { useEffect, useRef, useState } from "react";
import type { CategoryType } from "../types/types";
import { useStore } from "zustand";
import PopupFormStore from "../store/PopupFormStore";
import ColorDropdown from "../components/ColorDropdown";
import AlertSwitch from "../components/AlertSwitch";
import ColorDropdownDataStore from "../store/ColorDropdownDataStore";
import utils from "../utils/utils";
import AlertSwitchDataStore from "../store/AlertSwitchDataStore";

const defaultColor = 'gray';

function CreateCategoryForm({ setLoadPopup }: { setLoadPopup: (val: boolean) => void }) {
    const { args } = useStore(PopupFormStore);
    const { load } = args;
    const { selectedColor, setSelectedColor } = useStore(ColorDropdownDataStore);
    const { alertState, setAlertState } = useStore(AlertSwitchDataStore);

    const [nameFieldFocused, setNameFieldFocused] = useState(false);
    const [descFieldFocused, setDescFieldFocused] = useState(false);

    const nameRef = useRef(null);
    const descriptionRef = useRef(null);

    const resetData = () => {
        nameRef.current.value = '';
        descriptionRef.current.value = '';
        setSelectedColor({
            value: defaultColor,
            label: utils.capitalizeWords(defaultColor)
        });
        setAlertState(false);
    };

    const submitFn = () => {
        const name = nameRef.current.value;
        const description = descriptionRef.current.value;
        const color = selectedColor.value;
        const alert = alertState;

        if (!name || !description) {
            // warn('fill all the fields')
            return;
        }

        console.log(name);
        console.log(description);
        console.log(color);
        console.log(alert);

        resetData();
        setLoadPopup(false);
    };

    const cancelFn = () => {
        resetData();
        setLoadPopup(false);
    };

    return (
        <div
            className={`px-5 pb-5 grid relative place-items-center items-center duration-500 bg-white shadow-plum-secondary-sm rounded-2xl ${
                !load ? 'scale-60' : 'scale-100'
            }`}
        >
            <div className="select-none w-fit flex items-center p-0.5 px-2.5 gap-x-1 font-cabin bg-plum-primary-dark text-plum-bg rounded-full -translate-y-1/2">
                <div className="h-3 w-3 mr-1 rounded-full bg-plum-bg"></div>
                <span className="font-semibold">Create</span>
                <span>Category</span>
            </div>

            <div className="grid relative w-60 items-center place-items-center gap-4 mt-5">
                <div className="flex gap-2 items-center w-full">
                    <div className="relative w-1/2 duration-400">
                        <label
                            htmlFor="name"
                            className={`select-none absolute px-0.5 z-20 -top-3.5 left-3 bg-white ${
                                nameFieldFocused ? 'text-plum-secondary' : 'text-plum-primary-dark'
                            } duration-400`}
                        >
                            Name
                        </label>
                        <div
                            className={`w-full border-2 z-0 relative ${
                                nameFieldFocused ? 'border-plum-secondary' : 'border-plum-primary-dark'
                            } rounded-full`}
                        >
                            <input
                                onFocus={() => setNameFieldFocused(true)}
                                onBlur={() => setNameFieldFocused(false)}
                                ref={nameRef}
                                id="name"
                                required
                                className={`pl-3 rounded-full p-1 w-full font-medium ${
                                    nameFieldFocused ? 'text-plum-secondary' : 'text-plum-primary-dark'
                                } placeholder:font-normal placeholder:text-plum-surface placeholder:select-none bg-transparent outline-none focus:outline-none duration-400`}
                                placeholder="Eg. Alert"
                            />
                        </div>
                    </div>
                    <div className="z-100 w-1/2">
                        <ColorDropdown />
                    </div>
                </div>

                <div className="relative w-full duration-400">
                    <label
                        htmlFor="description"
                        className={`select-none absolute px-0.5 z-20 -top-3.5 left-3 bg-white ${
                            descFieldFocused ? 'text-plum-secondary' : 'text-plum-primary-dark'
                        } duration-400`}
                    >
                        Description
                    </label>
                    <div
                        className={`w-full border-2 z-0 relative ${
                            descFieldFocused ? 'border-plum-secondary' : 'border-plum-primary-dark'
                        } rounded-full`}
                    >
                        <input
                            onFocus={() => setDescFieldFocused(true)}
                            onBlur={() => setDescFieldFocused(false)}
                            ref={descriptionRef}
                            id="description"
                            required
                            className={`pl-3 rounded-full p-1 w-full font-medium ${
                                descFieldFocused ? 'text-plum-secondary' : 'text-plum-primary-dark'
                            } placeholder:font-normal placeholder:text-plum-surface placeholder:select-none bg-transparent outline-none focus:outline-none duration-400`}
                            placeholder="Eg. Due, Urgent, etc"
                        />
                    </div>
                </div>

                <div className="w-full">
                    <AlertSwitch />
                </div>

                <div className="w-full flex gap-x-2 items-center mt-5">
                    <button
                        className="w-full px-3 py-0.5 duration-300 select-none rounded-full cursor-pointer bg-none hover:bg-plum-bg-bold text-plum-secondary"
                        onClick={() => {
                            cancelFn();
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="w-full px-3 py-0.5 duration-150 rounded-full cursor-pointer font-semibold bg-plum-primary text-plum-bg"
                        onClick={() => {
                            submitFn();
                        }}
                    >
                        Create
                    </button>
                </div>
            </div>
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