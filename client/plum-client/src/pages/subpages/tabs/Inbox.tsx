import Mail from "../../../components/Mail";
import EmailsStore from "../../../store/EmailsStore";
import type { InboundEmailType } from "../../../types/types";
import type { JSX } from "react";

function Inbox(): JSX.Element {
    const { emails = [] }: { emails?: InboundEmailType[] } = EmailsStore();

    return (
        <div className="grid gap-y-2">
            {emails.map((email, idx) => {
                const key = (email as InboundEmailType).id ?? idx;
                return <Mail key={key} mail={email} />;
            })}
        </div>
    );
}

export default Inbox;
