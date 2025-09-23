import Mail from "../../../components/Mail";
import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import type { JSX } from "react";
import components from "../../../components/components";

function Inbox(): JSX.Element {
    const { date } = DateStore();
    const { data: emails, isLoading } = useEmails(date);
    const { Loading, NoMails } = components;

    if (isLoading) return <Loading />;
    if (!emails || emails.length === 0) return <NoMails />;

    const sortedEmails = emails.sort((a, b) => {
        return new Date(a.timestamp) + new Date(b.timestamp);
    });

    return (
        <div className="grid gap-y-2.5">
            {sortedEmails.map((email, idx) => (
                <Mail key={email.id ?? idx} mail={email} />
            ))}
        </div>
    );
}

export default Inbox;
