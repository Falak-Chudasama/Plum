import { useEffect, useState, useRef } from "react";
import DateStore from "../../store/DateStore";
import MailsTabsStore from "../../store/MailsTabsStore";
// import Inbox from "./tabs/Inbox";
// import Categorized from "./tabs/Categorized";
// import Summary from "./tabs/Summary";
// import Threads from "./tabs/Threads";

function DayNavigator() {
    const formatDate = (d: Date) => {
        const parts = d.toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
        }).split(" ");

        return parts.map((val, idx) => {
            if (idx === 1) {
                let suffix = "th";
                if (val.endsWith("1") && val !== "11") suffix = "st";
                else if (val.endsWith("2") && val !== "12") suffix = "nd";
                else if (val.endsWith("3") && val !== "13") suffix = "rd";

                return parseInt(val, 10) + suffix;
            }
            return val;
        }).join(" ");
    };

    const areSameDays = (day1: Date, day2: Date): boolean => {
        return day1.getFullYear() === day2.getFullYear() &&
            day1.getMonth() === day2.getMonth() &&
            day1.getDate() === day2.getDate();
    };

    const { date, setDate } = DateStore();
    const [day, setDayDate] = useState(date);
    const [isToday, setIsToday] = useState(areSameDays(date, day));
    const [displayedDate, setDisplayedDate] = useState(formatDate(day));

    useEffect(() => {
        setDisplayedDate(formatDate(day));
        setDate(day);
        const today = new Date();
        setIsToday(areSameDays(today, day));
    }, [day]);

    function handleDateChange(addDay: boolean = false) {
        if (isToday && addDay) return;
        setDayDate(new Date(day.setDate(day.getDate() + (addDay ? 1 : -1))));
        const today = new Date();
    }

    const btnClass = `text-plum-bg text-lg font-medium px-3 rounded-full hover:px-5 duration-225`;

    return (
        <div className="mt-8 select-none">
            <div className="flex items-center gap-x-5">
                <h1 className="text-plum-secondary font-cabin font-bold text-4xl">
                    {displayedDate}
                </h1>
                <p className="text-md text-plum-bg bg-plum-secondary px-2 rounded-lg">
                    28 Mails {/* Make it dynamic  */}
                </p>
            </div>
            <div className="mt-3 flex gap-x-1.5">
                <button onClick={() => handleDateChange()} className={`bg-plum-primary cursor-pointer ${btnClass}`}>Previous</button>
                <button onClick={() => handleDateChange(true)} className={`${isToday ? "bg-plum-primary-dark cursor-not-allowed" : "bg-plum-primary cursor-pointer"} ${btnClass}`}>Next</button>
            </div>
        </div>
    );
}

function TabNavigator() {
    const { tab, setTab } = MailsTabsStore();
    const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
    const refs = {
        inbox: useRef<HTMLParagraphElement>(null),
        categorized: useRef<HTMLParagraphElement>(null),
        summary: useRef<HTMLParagraphElement>(null),
        threads: useRef<HTMLParagraphElement>(null),
    };

    const updateIndicator = () => {
        const ref = refs[tab]?.current;
        if (ref) {
            setIndicatorStyle({
                left: ref.offsetLeft,
                width: ref.offsetWidth,
            })
        }
    }

    useEffect(() => {
        updateIndicator();
    }, [tab]);

    useEffect(() => {
        window.addEventListener("resize", updateIndicator);
        return () => window.removeEventListener("resize", updateIndicator);
    }, [tab]);

    const textClass = 'text-2xl font-cabin font-semibold cursor-pointer duration-200';

    return (
        <div className="w-fit mt-10 select-none relative">
            <div className="flex gap-x-4 px-3 relative">
                <p ref={refs.inbox} onClick={() => setTab('inbox')}
                    className={`${textClass} ${tab === 'inbox' ? 'text-plum-secondary' : 'text-plum-primary hover:text-plum-primary-dark'} `}>
                    Inbox
                </p>
                <p ref={refs.categorized} onClick={() => setTab('categorized')}
                    className={`${textClass} ${tab === 'categorized' ? 'text-plum-secondary' : 'text-plum-primary hover:text-plum-primary-dark'} `}>
                    Categorized
                </p>
                <p ref={refs.summary} onClick={() => setTab('summary')}
                    className={`${textClass} ${tab === 'summary' ? 'text-plum-secondary' : 'text-plum-primary hover:text-plum-primary-dark'} `}>
                    Summary
                </p>
                <p ref={refs.threads} onClick={() => setTab('threads')}
                    className={`${textClass} ${tab === 'threads' ? 'text-plum-secondary' : 'text-plum-primary hover:text-plum-primary-dark'} `}>
                    Threads
                </p>
            </div>
            <div className="w-full relative mt-1 h-1.25 rounded-full bg-plum-bg-bold">
                <div className={`h-full top-0 absolute bg-plum-secondary rounded-full transition-all duration-300`}
                    style={{
                        left: indicatorStyle.left,
                        width: indicatorStyle.width
                    }}></div>
            </div>
        </div>
    );
}

function Mail() {
    return <>

    </>
}

function Main() {
    return (
        <div></div>
    );
}

function Mails() {
    useEffect(() => {
        document.title = 'Plum | Mails';
    }, [])

    return (
        <div className="w-full">
            <DayNavigator />
            <TabNavigator />
            <Main />
        </div>
    );
}
export default Mails