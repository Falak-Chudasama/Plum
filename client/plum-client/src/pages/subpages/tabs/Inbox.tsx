import Mail from "../../../components/Mail";
import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import type { InboundEmailType } from "../../../types/types";
import type { JSX, ReactElement } from "react";
import NoMails from "../../../components/NoMails";
import Loading from "../../../components/Loading";

// TODO: Sort the mails by time in the inbox

function Inbox(): JSX.Element {
    const { date } = DateStore();
    const { data: emails, isLoading } = useEmails(date);

    if (isLoading) return <Loading />;
    if (!emails || emails.length === 0) return <NoMails />;

    return (
        <div className="grid gap-y-2.5">
            {emails.map((email, idx) => (
                <Mail key={email.id ?? idx} mail={email} />
            ))}
        </div>
    );
}

export default Inbox;
