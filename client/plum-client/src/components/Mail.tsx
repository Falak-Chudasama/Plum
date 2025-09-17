import { useMemo } from "react";
import { type InboundEmailType, type Category } from "../types/types";

const textLim1 = 60;
const textLim2 = 90;

function CategoryComp({ title }: { title: string }) {
    return (
        <div className="font-cabin bg-red-200 border-red-700 border-2 pl-1.5 pr-2 text-sm font-medium rounded-full flex items-center gap-x-2">
            <div className="h-3 w-3 rounded-full bg-red-700" />
            <p className="text-red-700">{title}</p>
        </div>
    );
}

function shortenText(subject: string, limit: number) {
    if (!subject) return "";
    if (subject.length <= limit) return subject;

    const slice = subject.slice(0, limit + 1);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 0) {
        return subject.slice(0, lastSpace).trim() + "...";
    }
    return subject.slice(0, limit).trim() + "...";
}

function modifiedTime(time: string): string {
    const [hoursStr, minutes] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

type MailProps = {
    mail: InboundEmailType;
    showCategs?: boolean;
};

export default function Mail({ mail, showCategs = true }: MailProps) {
    const subject = mail.subject ?? "";

    const shortenedSubject = useMemo(() => {
        const limit = showCategs ? textLim1 : textLim2;
        return shortenText(subject, limit);
    }, [subject, showCategs]);

    const categories: string[] =
        showCategs && Array.isArray((mail as InboundEmailType).categories) && (mail as InboundEmailType).categories!.length
            ? (mail as any).categories.map((c: Category | string) =>
                typeof c === "string" ? c : (c as any).title ?? JSON.stringify(c)
            )
            : showCategs
            ? mail.categories
            : [];

    return (
        <div className="w-full h-9 px-4 rounded-full flex items-center justify-between bg-plum-bg-bold hover:bg-plum-bg border-plum-secondary border-2 duration-250 cursor-pointer">
            <p className="text-plum-secondary font-medium">{mail.senderName ?? mail.senderEmail}</p>
            <p className="text-plum-primary">{shortenedSubject}</p>
            <div className="flex items-center gap-x-4">
                {showCategs && (
                    <div className="flex gap-x-1">
                        {categories.map((title, idx) => (
                            <CategoryComp key={title + idx} title={title} />
                        ))}
                    </div>
                )}
                <p className="font-medium text-plum-secondary">{modifiedTime(mail.parsedDate?.time)}</p>
            </div>
        </div>
    );
}
