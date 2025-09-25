import { useEffect, useState } from "react";
import type { InboundEmailType } from "../types/types";

function FullMail({ mail = null }: { mail: InboundEmailType | null }) {
    const [ showMail, setShowMail ] = useState(mail !== null);

    useEffect(() => {
        if (mail !== null) {
            setShowMail(true);
        }
    }, [mail])

    const handleCancelBtnClick = () => {
        setShowMail(false);
    };

    return (
        <div className={`fixed h-30 z-50 w-fit duration-500 ease-in-out bottom-0 right-0 p-5 flex justify-end ${!showMail ? "translate-x-full" : "translate-x-0"}`}>
            <div className="bg-plum-primary shadow-plum-surface-lg flex justify-end">
                <button className="bg-plum-bg text-plum-primary cursor-pointer" onClick={() => handleCancelBtnClick()}>
                    Close
                </button>
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
    );
}
export default FullMail