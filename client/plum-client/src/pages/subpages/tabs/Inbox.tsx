import Mail from "../../../components/Mail";
import { type InboundEmailType, type ParsedDate } from "../../../types/types";

function Inbox() {
    const sampleDate: ParsedDate = {
        weekday: "Monday",
        day: "16",
        month: "September",
        year: "2025",
        time: "17:13:03",
    }
    const sampleEmail: InboundEmailType = {
        email: "john.doe@example.com",
        id: "msg_1234567890",
        threadId: "thread_0987654321",
        to: "support@example.com",
        cc: "manager@example.com",
        bcc: "auditor@example.com",
        senderEmail: "jane.smith@example.com",
        senderName: "Jane Smith",
        subject: "Invitation to Participate – International Conference on Biological Sciences - Coast, Community & Conservation",
        parsedDate: sampleDate,
        snippet: "Hi team, please find attached the Q3 report ",
        bodyHtml: "<p>Hi team,</p><p>Please find attached the Q3 report.</p>",
        bodyText: "Hi team,\n\nPlease find attached the Q3 report.",
        timestamp: new Date("2025-09-16T10:45:00Z").toISOString(),
        sizeEstimate: 2048000,
        categories: ["Reports", "Finance"],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    return (
        <div className="grid gap-y-2">
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
            <Mail mail={sampleEmail} />
        </div>
    );
}
export default Inbox