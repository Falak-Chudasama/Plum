import Mail from "../../../components/Mail";
import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import type { JSX } from "react";
import components from "../../../components/components";

// TODO: Sort the mails by time in the inbox

function Inbox(): JSX.Element {
    const { date } = DateStore();
    const { data: emails, isLoading } = useEmails(date);
    const { Loading, NoMails } = components;

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
