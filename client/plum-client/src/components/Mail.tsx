import { useMemo } from "react";
import { type InboundEmailType, type CategoryType } from "../types/types";
import useCategories from "../hooks/useCategories";
import useSelectedMailStore from "../store/SelectedMailStore";

const nameLim = 20;
const subjectLim1 = 40;
const subjectLim2 = 60;
const subjectLim3 = 80;

const colorMap = {
    red: { dark: '#E53935', light: '#FFD7DC' },
    green: { dark: '#43A047', light: '#DAFFDC' },
    blue: { dark: '#1E88E5', light: '#DDEFFF' },
    yellow: { dark: '#FF9000', light: '#FFF0D5' },
    purple: { dark: '#7A5BB9', light: '#E0CCFF' },
    gray: { dark: '#616161', light: '#E4E4E4' },
} as const;

type ColorMapKey = keyof typeof colorMap;

function getColorsFromCategoryColor(colorVal?: string) {
    if (!colorVal) return colorMap.gray;

    if (colorVal.startsWith("#")) {
        return { dark: colorVal, light: colorVal + "26" };
    }

    const key = colorVal as ColorMapKey;
    if (key in colorMap) return colorMap[key];

    return colorMap.gray;
}

function CategoryComp({ title, categoriesData }: { title: string; categoriesData?: CategoryType[] }) {
    if (!categoriesData) return null;
    const cat = categoriesData.find((c) =>
        (c as any).category === title
    );

    if (!cat) {
        return null;
    }

    const { dark, light } = getColorsFromCategoryColor((cat as any).color);

    return (
        <div className="font-cabin border-2 pl-1.5 pr-2 text-sm font-medium rounded-full flex items-center gap-x-2"
            style={{ backgroundColor: light, borderColor: dark }}>
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dark }} />
            <p style={{ color: dark }}>{title}</p>
        </div>
    );
}

function shortenText(subject: string, limit: number) {
    if (!subject) return "";
    if (subject.length <= limit) return subject;
    const slice = subject.slice(0, limit + 1);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 0) return subject.slice(0, lastSpace).trim() + "...";
    return subject.slice(0, limit).trim() + "...";
}

function modifiedTime(time?: string): string {
    if (!time) return "";
    const [hoursStr, minutes] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    if (Number.isNaN(hours)) return time;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

type MailProps = {
    mail: InboundEmailType;
    showCategs?: boolean;
};

export default function Mail({ mail, showCategs = true }: MailProps) {
    const subject = mail.subject.trim() ?? "No Subject";

    const { data: categoriesData = [], isLoading: categoriesLoading } = useCategories();
    const { setMail } = useSelectedMailStore();

    const handleMailClick = () => {
        setMail(mail);
    }

    const shortenedSubject = useMemo(() => {
        const limit = showCategs ? (mail.categories?.length === 2 ? subjectLim1 : subjectLim2) : subjectLim3;
        return shortenText(subject, limit);
    }, [subject, showCategs]);

    const categories: string[] = useMemo(() => {
        if (!showCategs) return [];
        const c = mail.categories;
        if (!Array.isArray(c) || c.length === 0) return [];
        return c.map((entry) => {
            if (!entry) return "";
            if (typeof entry === "string") return entry;
            return (entry as any).title ?? (entry as any).category ?? (entry as any).name ?? JSON.stringify(entry);
        }).filter(Boolean);
    }, [mail.categories, showCategs]);

    let categoryComps = categories.map((title, idx) => (
        <CategoryComp key={`${title}-${idx}`} title={title} categoriesData={categoriesData} />
    )).filter((comp) => comp !== null);

    if (!categoryComps) {
        categoryComps = <CategoryComp key={`Other`} title={'Other'} categoriesData={categoriesData}/>
    }

    return (
        <div onClick={() => handleMailClick()} className={`text-sm w-full h-9.5 px-4 shadow-plum-surface-xs rounded-full flex items-center justify-between bg-plum-bg-bold hover:bg-plum-bg border-plum-secondary border-2 duration-200 cursor-pointer`}>
            <div className="flex items-center">
                <p className="text-plum-secondary font-medium w-52">{shortenText(mail.senderName, nameLim) ?? shortenText(mail.senderEmail, nameLim)}</p>
                <p className="text-plum-primary">{shortenedSubject}</p>
            </div>
            <div className="flex items-center gap-x-4">
                {showCategs && (
                    <div className="flex gap-x-1">
                        {categoryComps}
                    </div>
                )}
                <p className="font-medium text-plum-secondary">{modifiedTime(mail.parsedDate?.time)}</p>
            </div>
        </div>
    );
}
