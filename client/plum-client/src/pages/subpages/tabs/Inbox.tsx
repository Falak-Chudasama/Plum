import Mail from "../../../components/Mail";
import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import type { JSX } from "react";
import components from "../../../components/components";
import { useMemo } from "react";

function Inbox(): JSX.Element {
    const { date } = DateStore();
    const { data: emails = [], isLoading } = useEmails(date);
    const { Loading, NoMails } = components;

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
        <div className="grid gap-y-2.5">
            {sortedEmails.map((email, idx) => (
                <Mail key={email.id ?? idx} mail={email} />
            ))}
        </div>
    );
}

export default Inbox;