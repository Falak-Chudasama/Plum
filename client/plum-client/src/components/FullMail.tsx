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
                            <p className="w-10 select-none">From</p>
                            <p className="text-plum-primary">{senderEmail}</p>
                        </div>
                        <div className="text-sm flex items-start justify-start max-h-30 overflow-y-auto">
                            <p className="w-10 select-none">To</p>
                            <p className="text-plum-primary max-w-70 text-wrap">{recieverEmail}</p>
                        </div>
                    </div>
                </div>
                <div className="w-0.25 bg-plum-primary rounded-full self-stretch my-2"></div>
                <div className="grid self-stretch gap-y-2">
                    <div className="h-full flex items-stretch gap-x-1 text-[15px]">
                        <span className="font-medium select-none">{time}</span>
                        <span className="text-plum-primary-dark select-none">({timeAgo} ago)</span>
                        <span className="select-none">|</span>
                        <span className="font-medium select-none">{date}</span>
                    </div>
                    <div className="place-items-end self-end grid gap-y-1">
                        {categoryComps}
                    </div>
                </div>
            </div>
            <div className="h-1.5 w-49/50 self-center rounded-full bg-plum-purple mt-1.5"></div>
            <div className="w-48/50 mt-4 max-w-180">
                <div className="w-full text-xl font-semibold font-cabin">
                    <p className="text-start text-wrap">{subject}</p>
                </div>
                <div className="max-h-35 overflow-y-auto text-sm mt-2 space-y-3 leading-relaxed">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ node, ...props }) => (
                                <a
                                    {...props}
                                    className="text-plum-primary hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                />
                            ),
                        }}
                    >
                        {body}
                    </ReactMarkdown>
                </div>
            </div>
            <div className="w-48/50 mt-5 max-w-180 flex items-center gap-x-2 gap-y-2 flex-wrap">
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
                <button className="group bg-plum-purple z-50 text-md font-medium font-cabin px-3 pt-0.5 rounded-t-xl mr-5 text-plum-primary hover:bg-red-600 hover:text-red-50 cursor-pointer flex items-center gap-x-1 duration-350 shadow-plum-secondary-xs select-none" onClick={() => handleCancelBtnClick()}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="11"
                        height="11"
                        viewBox="0 0 11 11"
                        className="fill-plum-primary group-hover:fill-plum-bg transition-colors duration-300"
                    >
                        <path d="M0.530228 10.1367C0.237334 9.84385 0.237334 9.36898 0.530228 9.07608L9.36906 0.237248C9.66196 -0.0556453 10.1368 -0.055645 10.4297 0.237248C10.7226 0.530141 10.7226 1.00502 10.4297 1.29791L1.59089 10.1367C1.29799 10.4296 0.823121 10.4296 0.530228 10.1367Z" />
                        <path d="M10.4297 10.4296C10.7226 10.1367 10.7226 9.66187 10.4297 9.36898L1.59088 0.53014C1.29798 0.237247 0.82311 0.237247 0.530217 0.530141C0.237324 0.823034 0.237324 1.29791 0.530217 1.5908L9.36905 10.4296C9.66195 10.7225 10.1368 10.7225 10.4297 10.4296Z" />
                    </svg>
                    <p>
                        Close
                    </p>
                </button>
                <div className="bg-white z-40 h-full w-full shadow-plum-secondary-lg pt-2.5 px-2.5 rounded-xl">
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