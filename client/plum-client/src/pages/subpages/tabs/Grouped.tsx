import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import useCategories from "../../../hooks/useCategories";
import components from "../../../components/components";
import constants from "../../../constants/constants";
import { useEffect, useMemo } from "react";
import { groupEmailsByApiCategories } from "../../../utils/groupEmailsByApiCategories";
import utils from "../../../utils/utils";
import { useStore } from "zustand";
import PopupFormStore from "../../../store/PopupFormStore";
import { createPortal } from "react-dom";
import type { CategoryType } from "../../../types/types";

function CategorizedMails({ grouped }: { grouped: Record<string, { emails: any[]; color: string }> }) {
    const { UpHook, DownHook, Mail } = components;
    const { data: categories } = useCategories();
    const { setArgs } = useStore(PopupFormStore);

    const set = new Set(Object.entries(categories).map((cat) => cat[1].category.toLowerCase()));

    const findCategory = (name: string) => {
        console.log(categories);
        return categories.filter((cat: CategoryType) => cat.category === name)[0] ?? null;
    }

    const handleEditClick = (category: CategoryType) => {
        setArgs({
            formType: 'edit-category',
            category,
            load: true,
        })
    }

    return (
        <div className="grid gap-y-15 pt-3 pb-5">
            {Object.entries(grouped).map(([categoryName, { emails, color }]) => {
                if (categoryName !== 'other' && !set.has(categoryName)) return null;

                const catColor = constants.colorMap[color]?.dark ?? constants.colorMap.gray.dark;
                const displayName = utils.capitalizeWords(categoryName);

                return (
                    <div key={categoryName} className="group grid w-full">
                        <div className="flex items-start w-full">
                            <UpHook color={catColor} />
                            <div className="flex items-start relative">
                                <div
                                    className="h-3 w-3 -ml-0.5 rounded-full"
                                    style={{ backgroundColor: catColor }}
                                ></div>
                                <div className="absolute flex items-center justify-center gap-1.75 -mt-2.75">
                                    <p
                                        className="text-2xl font-cabin font-medium ml-4"
                                        style={{ color: catColor }}
                                    >
                                        {displayName}
                                    </p>
                                    {
                                        categoryName !== 'other' ? (
                                        <div onClick={() => handleEditClick(findCategory(displayName))} className='flex items-center justify-center h-4.5 w-4.5 mt-1 rounded-full duration-300 opacity-0 group-hover:opacity-100 cursor-pointer' style={{ backgroundColor: catColor }}>
                                            <svg className="ml-0.25 scale-125" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                <path d="M5.81607 0.104821C5.98316 0.0356183 6.16222 0 6.34305 0C6.52388 0 6.70294 0.0356183 6.87003 0.104821C7.03709 0.174023 7.18889 0.275456 7.31677 0.403323C7.44464 0.531191 7.54608 0.682994 7.61528 0.850066C7.68445 1.01713 7.72008 1.1962 7.72008 1.37703C7.72008 1.55786 7.68445 1.73693 7.61528 1.904C7.54608 2.07107 7.44464 2.22287 7.31677 2.35074L7.11675 2.55074L5.16936 0.60332L5.36934 0.403323C5.49721 0.275456 5.64902 0.174023 5.81607 0.104821Z" fill="white" />
                                                <path d="M4.62354 1.15011L0.639132 5.13452C0.591633 5.18199 0.557354 5.24109 0.53968 5.30589L0.0140973 7.23302C-0.0223471 7.36665 0.0156065 7.50958 0.113549 7.6075C0.211492 7.70546 0.354405 7.7434 0.488036 7.70697L2.41517 7.18138C2.47998 7.1637 2.53905 7.12942 2.58655 7.08191L6.57093 3.09754L4.62354 1.15011Z" fill="white" />
                                            </svg>
                                        </div>
                                        ) : (<></>)
                                    }
                                </div>
                            </div>
                        </div>

                        {emails.map((mail, index) => (
                            <div key={index}>
                                {index === 0 ? (
                                    <div
                                        className="w-[2.8px] h-9 group-hover:h-12 -mt-0.25 duration-200"
                                        style={{ backgroundColor: catColor }}
                                    ></div>
                                ) : (
                                    <div
                                        className="w-[2.8px] h-12 -mt-1.25 duration-200"
                                        style={{ backgroundColor: catColor }}
                                    ></div>
                                )}

                                <div className="flex items-center w-full">
                                    <DownHook color={catColor} />
                                    <div className="absolute ml-2 w-17/20">
                                        <Mail mail={mail} showCategs={false} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }).filter((cat) => cat !== null)}
        </div>
    );
}

function AddCategory() {
    const { args, setArgs } = useStore(PopupFormStore);
    const { category, load } = args;
    const handleClick = () => {
        setArgs({
            formType: 'create-category',
            load: true,
            category
        });
    }
    return createPortal(
        <button onClick={() => handleClick()}
            className={`
                fixed bottom-8 right-7
                font-cabin text-2xl
                bg-plum-primary text-plum-bg shadow-plum-secondary-lg
                z-10 cursor-pointer px-3 py-1.5 rounded-2xl
                flex items-center justify-center gap-1.5
                duration-300 hover:px-4.75 hover:shadow-plum-secondary-xl
                ${load ? 'blur-[4px]' : 'blur-none'}
            `}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M7.87305 0C12.2212 8.08895e-05 15.7461 3.52485 15.7461 7.87305C15.746 12.2212 12.2212 15.746 7.87305 15.7461C3.52485 15.7461 8.61696e-05 12.2212 0 7.87305C0 3.5248 3.5248 0 7.87305 0ZM7.86621 1.72461C7.36985 1.72461 6.9668 2.12669 6.9668 2.62305V5.69727C6.9668 6.42621 6.37638 7.01746 5.64746 7.01758H2.77148C2.30936 7.01758 1.93457 7.39237 1.93457 7.85449C1.93466 8.31654 2.30941 8.69141 2.77148 8.69141H5.64746C6.37627 8.69152 6.96662 9.28195 6.9668 10.0107V13.123C6.96694 13.6193 7.36994 14.0215 7.86621 14.0215C8.36237 14.0214 8.7645 13.6192 8.76465 13.123V10.0107C8.76483 9.28188 9.35606 8.69141 10.085 8.69141H12.9854C13.4474 8.69141 13.8222 8.31654 13.8223 7.85449C13.8223 7.39237 13.4475 7.01758 12.9854 7.01758H10.085C9.35595 7.01758 8.76465 6.42628 8.76465 5.69727V2.62305C8.76465 2.12677 8.36246 1.72473 7.86621 1.72461Z" fill="#CFBFFB" />
            </svg>
            Category
        </button>
        , document.body)
}


function Grouped() {
    const { date } = DateStore();
    const { data: emails = [], isLoading } = useEmails(date);
    const { Loading, NoMails } = components;
    const { data: categories } = useCategories();

    let grouped = useMemo(
        () => groupEmailsByApiCategories(emails, categories, { preserveKeys: false, uncategorizedKey: 'Other' }),
        [emails, categories]
    );

    if (isLoading) return <Loading />;
    if (!emails || emails.length === 0) return <NoMails />;

    return (
        <>
            <CategorizedMails grouped={grouped} />
            <AddCategory />
        </>
    );
}

export default Grouped;
