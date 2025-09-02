const getToday = () => {
    const date = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
        timestamp: date.getTime(),
        day: pad(date.getDate()),
        weekday: date.toLocaleString('en-US', { weekday: "long" }),
        month: date.toLocaleString('en-US', { month: "long" }),
        year: String(date.getFullYear()),
        seconds: pad(date.getSeconds()),
        hours: pad(date.getHours()),
        minutes: pad(date.getMinutes()),
        milliseconds: date.getMilliseconds(),
        iso: date.toISOString(),
        readable: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${date.toLocaleString('en-US', { month: "long" })} ${date.getDate()}, ${date.getFullYear()}`
    };
};

const getMinuteDifference = (dateStr: string, timeStr: string): number => {
    const [dayStr, monthStr, yearStr] = dateStr.split('/');
    const [hoursStr, minutesStr, secondsStr] = timeStr.split(':');

    const monthNames: Record<string, number> = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
    };

    const pastDate = new Date(
        Number(yearStr),
        monthNames[monthStr],
        Number(dayStr),
        Number(hoursStr),
        Number(minutesStr),
        Number(secondsStr)
    );

    const now = new Date();
    const diffMs = now.getTime() - pastDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return diffMinutes;
};

const utils = {
    getToday,
    getMinuteDifference,
};
export default utils;