import { useMemo, useState } from "react";
import { type InboundEmailType } from "../types/types";
import useSelectedMailStore from "../store/SelectedMailStore";
import components from "./components";
import apis from "../apis/apis";
import { useQueryClient } from "@tanstack/react-query";
import utils from "../utils/utils";
import handleError from "../utils/errors.utils";

const nameLim = 20;
const subjectLim1 = 40;
const subjectLim2 = 60;
const subjectLim3 = 80;

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
    const { setMail } = useSelectedMailStore();
    const queryClient = useQueryClient();

    const [isViewed, setIsViewed] = useState(mail.isViewed);

    const updateVisibility = async () => {
        setIsViewed(true);
        const dayKey = utils.makeDayKeyFromDate(
            new Date(mail.parsedDate?.year ? `${mail.parsedDate.year}-${mail.parsedDate.month}-${mail.parsedDate.day}` : new Date())
        );
        try {
            await apis.updateIsViewed(mail.id);
            queryClient.setQueryData<InboundEmailType[]>(
                ['emails', dayKey],
                (oldData: InboundEmailType[]) => {
                    if (!oldData) return [];
                    return oldData.map((e) =>
                        e.id === mail.id ? { ...e, isViewed: true } : e
                    );
                }
            )
        } catch (err) {
            handleError(err);
        }
    }

    const handleMailClick = async () => {
        setMail(mail);
        await updateVisibility();
    }

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
        <components.Category key={`${title}-${idx}`} title={title} />
    )).filter((comp) => comp !== null);

    if (!categoryComps) {
        categoryComps = <components.Category key={`Other`} title={'Other'} />
    }

    return (
        <div onClick={() => handleMailClick()} className={`text-sm w-full h-9.5 px-4 shadow-plum-surface-xs rounded-full flex items-center justify-between ${!isViewed ? "bg-plum-bg-bold hover:bg-plum-bg" : "bg-white hover:bg-gray-100"} border-plum-secondary border-2 duration-200 cursor-pointer`}>
            <div className="flex items-center">
                <p className="text-plum-secondary font-medium w-52">{shortenText(mail.senderName, nameLim) ?? shortenText(mail.senderEmail, nameLim)}</p>
                <p className={`text-plum-primary truncate ${showCategs ? 'max-w-80' : 'max-w-120'}`}>{mail.subject}</p>
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