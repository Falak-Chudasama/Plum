import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import DateStore from "../../store/DateStore";
import MailsTabsStore from "../../store/MailsTabsStore";
import Inbox from "./tabs/Inbox";
import Categorized from "./tabs/Categorized";
import Summary from "./tabs/Summary";
import Threads from "./tabs/Threads";
import useEmails from "../../hooks/useEmails";

type TabType = 'inbox' | 'categorized' | 'summary' | 'threads';

function useKeyboardNavigation(
    onLeftArrow: () => void,
    onRightArrow: () => void,
    useCtrl: boolean = false
) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isCtrlPressed = event.ctrlKey;

            if (useCtrl && !isCtrlPressed) return;
            if (!useCtrl && isCtrlPressed) return;

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                onLeftArrow();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                onRightArrow();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onLeftArrow, onRightArrow, useCtrl]);
}

const formatDate = (date: Date): string => {
    const parts = date.toLocaleString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
    }).split(" ");

    return parts.map((val, idx) => {
        if (idx === 1) {
            const day = parseInt(val, 10);
            let suffix = "th";
            if (day % 10 === 1 && day !== 11) suffix = "st";
            else if (day % 10 === 2 && day !== 12) suffix = "nd";
            else if (day % 10 === 3 && day !== 13) suffix = "rd";

            return day + suffix;
        }
        return val;
    }).join(" ");
};

const areSameDays = (day1: Date, day2: Date): boolean => {
    return day1.getFullYear() === day2.getFullYear() &&
        day1.getMonth() === day2.getMonth() &&
        day1.getDate() === day2.getDate();
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

function DayNavigator() {
    const { date, setDate } = DateStore();
    const { data: emails = [], isLoading, error } = useEmails(date);
    const today = useMemo(() => new Date(), []);

    const isToday = useMemo(() => areSameDays(today, date), [today, date]);
    const displayedDate = useMemo(() => formatDate(date), [date]);

    const handlePreviousDay = useCallback(() => {
        setDate(addDays(date, -1));
    }, [date, setDate]);

    const handleNextDay = useCallback(() => {
        if (!isToday) {
            setDate(addDays(date, 1));
            // setEmails(emails);
        }
    }, [date, setDate, isToday]);

    useKeyboardNavigation(handlePreviousDay, handleNextDay, true);

    if (error) {
        return (
            <div className="mt-8 select-none">
                <div className="text-red-500 p-4 rounded-lg bg-red-50">
                    Error loading emails. Please try again.
                </div>
            </div>
        );
    }

    const btnClass = `text-plum-bg text-lg font-medium px-3 rounded-xl hover:px-5 duration-225`;

    return (
        <div className="mt-8 select-none">
            <div className="flex items-center gap-x-5">
                <h1 className="text-plum-secondary font-cabin font-bold text-4xl">
                    {displayedDate}
                </h1>
                <p className="text-md text-plum-bg bg-plum-secondary px-2 rounded-lg">
                    {isLoading ? "Loading..." : `${emails.length} ${emails.length === 1 ? 'Mail' : 'Mails'}`}
                </p>
            </div>
            <div className="mt-3 flex gap-x-1.5">
                <button
                    onClick={handlePreviousDay}
                    className={`bg-plum-primary cursor-pointer ${btnClass}`}
                    aria-label="Go to previous day (Ctrl+←)"
                >
                    Previous
                </button>
                <button
                    onClick={handleNextDay}
                    disabled={isToday}
                    className={`${isToday
                        ? "bg-plum-primary-dark cursor-not-allowed"
                        : "bg-plum-primary cursor-pointer"
                        } ${btnClass}`}
                    aria-label={isToday ? "Cannot go to future dates" : "Go to next day (Ctrl+→)"}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

function TabNavigator() {
    const tabs: TabType[] = ['inbox', 'categorized', 'summary', 'threads'];
    const { tab, setTab } = MailsTabsStore();
    const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

    const refs = useRef<Record<TabType, HTMLParagraphElement | null>>({
        inbox: null,
        categorized: null,
        summary: null,
        threads: null,
    });

    const updateIndicator = useCallback(() => {
        const ref = refs.current[tab];
        if (ref) {
            setIndicatorStyle({
                left: ref.offsetLeft,
                width: ref.offsetWidth,
            });
        }
    }, [tab]);

    const currentIndex = useMemo(() => tabs.indexOf(tab), [tab, tabs]);

    const handlePreviousTab = useCallback(() => {
        if (currentIndex > 0) {
            setTab(tabs[currentIndex - 1]);
        }
    }, [currentIndex, tabs, setTab]);

    const handleNextTab = useCallback(() => {
        if (currentIndex < tabs.length - 1) {
            setTab(tabs[currentIndex + 1]);
        }
    }, [currentIndex, tabs, setTab]);

    useKeyboardNavigation(handlePreviousTab, handleNextTab, false);

    useEffect(() => {
        updateIndicator();
    }, [updateIndicator]);

    useEffect(() => {
        const handleResize = () => {
            updateIndicator();
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [updateIndicator]);

    const textClass = 'text-2xl font-cabin font-semibold cursor-pointer duration-200 rounded px-1';

    const capitalizeTab = (tabName: string): string => {
        return tabName.charAt(0).toUpperCase() + tabName.slice(1);
    };

    return (
        <div className="w-fit mt-10 select-none relative">
            <div className="flex gap-x-4 px-3 relative">
                {tabs.map((tabName) => (
                    <p
                        key={tabName}
                        ref={(el) => { refs.current[tabName] = el; }}
                        onClick={() => setTab(tabName)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setTab(tabName);
                            }
                        }}
                        className={`${textClass} ${tab === tabName
                            ? 'text-plum-secondary'
                            : 'text-plum-primary hover:text-plum-primary-dark'
                            }`}
                        role="tab"
                        tabIndex={0}
                        aria-selected={tab === tabName}
                        aria-label={`${capitalizeTab(tabName)} tab`}
                    >
                        {capitalizeTab(tabName)}
                    </p>
                ))}
            </div>
            <div className="w-full relative mt-1 h-1.25 rounded-full bg-plum-bg-bold">
                <div
                    className="h-full top-0 absolute bg-plum-secondary rounded-full transition-all duration-300"
                    style={{
                        left: indicatorStyle.left,
                        width: indicatorStyle.width
                    }}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}

function Main() {
    const tabs: Record<TabType, React.ComponentType> = {
        inbox: Inbox,
        categorized: Categorized,
        summary: Summary,
        threads: Threads
    };

    const { tab } = MailsTabsStore();

    const TabComponent = tabs[tab];

    return (
        <div className="pr-30 pb-7 mt-7">
            <TabComponent />
        </div>
    );
}

function Mails() {
    useEffect(() => {
        document.title = 'Plum | Mails';
    }, []);

    return (
        <div className="w-full">
            <DayNavigator />
            <TabNavigator />
            <Main />
        </div>
    );
}

export default Mails;