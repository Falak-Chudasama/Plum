import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import useCategories from "../../../hooks/useCategories";
import components from "../../../components/components";
import constants from "../../../constants/constants";
import { useMemo } from "react";
import { groupEmailsByApiCategories } from "../../../utils/groupEmailsByApiCategories";

function capitalizeWords(str: string) {
    return str
        .split(/[_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function CategorizedMails({
    grouped,
}: {
    grouped: Record<string, { emails: any[]; color: string }>;
}) {
    const { UpHook, DownHook, Mail } = components;

    return (
        <div className="grid gap-y-15 pt-3 pb-5">
            {Object.entries(grouped).map(([categoryName, { emails, color }]) => {
                const catColor = constants.colorMap[color]?.dark ?? constants.colorMap.gray.dark;
                const displayName = capitalizeWords(categoryName);

                return (
                    <div key={categoryName} className="group grid w-full">
                        <div className="flex items-start w-full">
                            <UpHook color={catColor} />
                            <div className="flex items-start relative">
                                <div
                                    className="h-3 w-3 -ml-0.5 rounded-full"
                                    style={{ backgroundColor: catColor }}
                                ></div>
                                <p
                                    className="text-2xl font-cabin font-medium ml-4 -mt-2.75 absolute"
                                    style={{ color: catColor }}
                                >
                                    {displayName}
                                </p>
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
            })}
        </div>
    );
}


function Categorized() {
    const { date } = DateStore();
    const { data: emails = [], isLoading } = useEmails(date);
    const { Loading, NoMails } = components;
    const { data: categories } = useCategories();

    const grouped = useMemo(
        () => groupEmailsByApiCategories(emails, categories),
        [emails, categories]
    );

    if (isLoading) return <Loading />;
    if (!emails || emails.length === 0) return <NoMails />;

    return <CategorizedMails grouped={grouped} />;
}

export default Categorized;
