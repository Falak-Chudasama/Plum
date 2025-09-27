import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import components from "../../../components/components";
import constants from "../../../constants/constants";
import { useMemo } from "react";

function Categorized() {
    const { date } = DateStore();
    const { data: emails = [], isLoading } = useEmails(date);
    const { UpHook, DownHook, Mail, Loading, NoMails } = components;

    const sortedEmails = useMemo(() => {
        return [...emails].sort((a, b) => {
            const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta;
        });
    }, [emails]);

    if (isLoading) return <Loading />;
    if (!emails || emails.length === 0) return <NoMails />;

    return (
        <div className="grid gap-y-10">
            <div className="grid w-full">
                <div className="flex items-start w-full">
                    <UpHook color={constants.colorMap.red.dark} />
                    <div className="flex items-start relative">
                        <div className="h-3 w-3 -ml-0.5 rounded-full bg-plum-cat-red-dark"></div>
                        <p className="text-plum-cat-red-dark text-2xl font-cabin font-medium ml-4 -mt-2.75 absolute">
                            Assignment
                        </p>
                    </div>
                </div>
                <div className="w-[2.8px] h-8 bg-plum-cat-red-dark -mt-0.25"></div>
                <div className="flex items-center w-full">
                    <DownHook color={constants.colorMap.red.dark} />
                    {
                        sortedEmails.length > 0 ? (
                            <div className="absolute ml-2 w-17/20">
                                <Mail mail={emails[0]} showCategs={false} />
                            </div>
                        ) : <></>
                    }
                </div>
                <div className="w-[2.8px] h-13 bg-plum-cat-red-dark -mt-1.25"></div>
                <div className="flex items-center">
                    <DownHook color={constants.colorMap.red.dark} />
                    {
                        sortedEmails.length > 0 ? (
                            <div className="absolute ml-2 w-17/20">
                                <Mail mail={emails[1]} showCategs={false} />
                            </div>
                        ) : <></>
                    }
                </div>
            </div>
        </div>
    );
}

export default Categorized