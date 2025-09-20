import { useMemo } from "react";
import CategoryStore from "../store/CategoriesStore";
import { type InboundEmailType, type CategoryType } from "../types/types";

// TODO: Fix the styling of the Mail

const textLim1 = 60;
const textLim2 = 90;

const colorMap = {
    red: {
        dark: '#E53935',
        light: '#FFD7DC'
    },
    green: {
        dark: '#43A047',
        light: '#DAFFDC'
    },
    blue: {
        dark: '#1E88E5',
        light: '#DDEFFF'
    },
    yellow: {
        dark: '#FF9000',
        light: '#FFF0D5'
    },
    purple: {
        dark: '#7A5BB9',
        light: '#E0CCFF'
    },
    gray: {
        dark: '#616161',
        light: '#E4E4E4'
    },
};

function CategoryComp({ title }: { title: string }) {
    const { category } = CategoryStore(); 
    const color = category.map((cat) => {
        if (cat.category === title) return cat;
    }).filter((cat) => cat !== undefined)[0].color;

    const { dark, light } = colorMap[color];

    return (
        <div className={`font-cabin border-2 pl-1.5 pr-2 text-sm font-medium rounded-full flex items-center gap-x-2`} style={{
            backgroundColor: light,
            borderColor: dark
        }}>
            <div className={`h-3 w-3 rounded-full`} style={{
                backgroundColor: dark
            }} />
            <p style={{
                color: dark
            }}>{title}</p>
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
            ? (mail as any).categories.map((c: CategoryType | string) =>
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
