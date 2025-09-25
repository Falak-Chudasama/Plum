import { useEffect, useState } from "react";
import type { InboundEmailType } from "../types/types";
import useSelectedMailStore from "../store/SelectedMailStore";

function FullMail({ mail = null }: { mail: InboundEmailType | null }) {
    const { removeMail } = useSelectedMailStore();
    const [ showMail, setShowMail ] = useState(mail !== null);

    useEffect(() => {
        if (mail !== null) {
            setShowMail(true);
            console.log(mail);
        }
    }, [mail])

    const handleCancelBtnClick = () => {
        setShowMail(false);
        setTimeout(() => {
            removeMail();
        }, 300);
    };

    return (
        <div className={`fixed min-h-60 min-w-20 max-w-160 w-fit z-50 duration-250 bottom-0 right-0 flex justify-end ${!showMail ? "translate-x-full" : "translate-x-0"}`}>
            <div className="place-items-end pb-10 pr-5">
                <button className="bg-plum-surface text-lg font-medium font-cabin px-4 rounded-t-xl mr-5 text-plum-primary hover:bg-red-700 hover:text-plum-bg cursor-pointer block duration-350" onClick={() => handleCancelBtnClick()}>
                    Close
                </button>
                <div className="bg-white h-full w-full border-2">
                    {
                        mail === null ? (<div className="text-lg max-w-2xl">
                            No Mail Chosen
                        </div>) : (
                            <div className="text-lg max-w-2xl">
                                Subject: { mail.subject }
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}
export default FullMail