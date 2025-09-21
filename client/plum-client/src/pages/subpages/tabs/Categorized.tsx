import DateStore from "../../../store/DateStore";
import useEmails from "../../../hooks/useEmails";
import components from "../../../components/components";

function Categorized() {
    const { date } = DateStore();
    const { data: emails, isLoading } = useEmails(date);
    const { Loading, NoMails } = components;

    if (isLoading) return <Loading />;
    if (!emails || emails.length === 0) return <NoMails />;

    return (
        <div className="grid gap-y-2.5">
            Categorized
        </div>
    );
}
export default Categorized