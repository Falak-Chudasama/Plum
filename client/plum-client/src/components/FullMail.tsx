import { useEffect, useState, useMemo } from "react";
import type { InboundEmailType } from "../types/types";
import useSelectedMailStore from "../store/SelectedMailStore";
import components from "./components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Attachment from "./Attachment";
import MailsTabsStore from "../store/MailsTabsStore";
import SubpageStore from "../store/SubpageStore";

function modifiedTime(time?: string): string {
    if (!time) return "";
    const [hoursStr, minutes] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    if (Number.isNaN(hours)) return time;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

function timeAgoFrom(dateInput?: string | number | Date): string {
    if (!dateInput) return "";
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const diff = Date.now() - d.getTime();
    if (Number.isNaN(diff) || diff < 0) return "";
    const sec = Math.floor(diff / 1000);
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    const years = Math.floor(months / 12);
    return `${years}y`;
}

function getOrdinal(day: number) {
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
        case 1: return `${day}st`;
        case 2: return `${day}nd`;
        case 3: return `${day}rd`;
        default: return `${day}th`;
    }
}

const monthMap: Record<string, string> = {
    January: "Jan",
    February: "Feb",
    March: "Mar",
    April: "Apr",
    May: "May",
    June: "Jun",
    July: "Jul",
    August: "Aug",
    September: "Sept",
    October: "Oct",
    November: "Nov",
    December: "Dec"
};

function MailContent({ mail }: { mail: InboundEmailType }) {
    const subject = mail.subject ?? 'No Subject';
    const senderName = mail.senderName;
    const senderEmail = mail.senderEmail;
    let recieverEmail = mail.to!;
    const time = modifiedTime(mail.parsedDate?.time);
    const categories = mail.categories ?? ['Other'];
    const body = mail.bodyText;
    const attachments = mail.attachments;
    const timeAgo = useMemo(() => timeAgoFrom(mail.timestamp), [mail.timestamp]);
    const day = mail.parsedDate?.day;
    const month = mail.parsedDate?.month;

    const date = `${getOrdinal(Number(day))} ${monthMap[month ?? ""]}`;
    const attachmentComps = (
        attachments && attachments?.length > 0 ?
            attachments.map((attachment) => {
                return <Attachment filename={attachment.filename} />
            })
            : <></>
    );
    let categoryComps = categories.map((title, idx) => (
        <components.Category key={`${title}-${idx}`} title={title} />
    )).filter((comp) => comp !== null);

    if (recieverEmail.split(',').length > 1) {
        recieverEmail = recieverEmail?.split(',')
            .map((email) => {
                let e = email.split(' ');
                return e[e.length - 1].trim();
            })
            .map((email) => {
                return email.split('').filter((e) => (e !== '<' && e !== '>')).join('');
            }).join(', ');
    } else if (recieverEmail.split('<').length > 1) {
        recieverEmail = recieverEmail.split(' ');
        recieverEmail = recieverEmail[recieverEmail.length - 1];
        recieverEmail = recieverEmail.trim().split('').filter((c) => (c !== '<' && c !== '>'));
    }
    recieverEmail = recieverEmail ?? '<No Email>';

    return (
        <div className="text-lg grid place-items-center">
            <div className="bg-plum-purple h-fit w-full flex items-start justify-between gap-x-5 px-5 py-3 rounded-lg">
                <div className="grid items-stretch gap-y-2">
                    <p className="font-semibold max-w-80">
                        {senderName}
                    </p>
                    <div>
                        <div className="text-sm flex items-start justify-start">
                            <p className="w-10">From</p>
                            <p className="text-plum-primary">{senderEmail}</p>
                        </div>
                        <div className="text-sm flex items-start justify-start max-h-30 overflow-y-auto">
                            <p className="w-10">To</p>
                            <p className="text-plum-primary max-w-70 text-wrap">{recieverEmail}</p>
                        </div>
                    </div>
                </div>
                <div className="w-0.25 bg-plum-primary rounded-full self-stretch my-2"></div>
                <div className="grid self-stretch gap-y-2">
                    <div className="h-full flex items-stretch gap-x-1 text-[15px]">
                        <span className="font-medium">{time}</span>
                        <span className="text-plum-primary-dark">({timeAgo} ago)</span>
                        <span className="select-none">|</span>
                        <span className="font-medium">{date}</span>
                    </div>
                    <div className="place-items-end self-end grid gap-y-1">
                        {categoryComps}
                    </div>
                </div>
            </div>
            <div className="h-1.5 w-49/50 self-center rounded-full bg-plum-purple mt-1.5"></div>
            <div className="w-[95%] mt-2 max-w-180">
                <div className="w-full text-lg font-semibold font-cabin text-plum-primary-dark">
                    <p className="text-start text-wrap">{subject}</p>
                </div>
                <div className="max-h-35 overflow-y-auto text-sm mt-2 space-y-3 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                </div>
            </div>
            <div className="w-[95%] mt-5 max-w-180 flex items-center gap-x-2 gap-y-2 flex-wrap">
                {attachmentComps}
            </div>
        </div>
    )
}

function FullMail({ mail = null, subpageFor = mail }: { mail: InboundEmailType | null, subpageFor: string }) {
    const { removeMail } = useSelectedMailStore();
    const [showMail, setShowMail] = useState(mail !== null);
    const { tab } = MailsTabsStore();
    const { subpage } = SubpageStore();

    useEffect(() => {
        if (tab === 'summary' || subpage !== subpageFor) {
            setShowMail(false);
        }
    }, [tab, subpage]);

    useEffect(() => {
        if (mail !== null) {
            setShowMail(true);
        }
    }, [mail])

    const handleCancelBtnClick = () => {
        setShowMail(false);
        setTimeout(() => {
            removeMail();
        }, 300);
    };

    return (
        <div className={`fixed w-fit h-fit z-50 duration-300 bottom-0 right-0 flex justify-end ${!showMail ? "translate-x-full" : "translate-x-0"}`}>
            <div className="place-items-end pb-10 pr-5">
                <button className="bg-plum-purple text-lg font-medium font-cabin px-4 pt-0.25 rounded-t-xl mr-5 text-plum-primary hover:bg-red-600 hover:text-plum-bg cursor-pointer block duration-350 shadow-plum-secondary-xs select-none" onClick={() => handleCancelBtnClick()}>
                    Close
                </button>
                <div className="bg-white h-full w-full shadow-plum-secondary-lg pt-2.5 px-2.5 rounded-xl">
                    {
                        mail === null ? (<div className="text-lg">
                            No Mail Chosen
                        </div>) : (
                            <MailContent mail={mail} />
                        )
                    }
                </div>
            </div>
        </div>
    );
}
export default FullMail