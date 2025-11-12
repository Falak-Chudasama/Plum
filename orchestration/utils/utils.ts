function isCleanResponse(text: string) {
    return text;
}

function getISTDateTime() {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true, // enable AM/PM
    };

    // Get formatted parts
    const parts = new Intl.DateTimeFormat('en-IN', options)
        .formatToParts(now)
        .reduce((acc, part) => {
            if (part.type !== 'literal') acc[part.type] = part.value;
            return acc;
        }, {} as Record<string, string>);

    const day = parseInt(parts.day, 10);
    const month = parts.month;
    const year = parts.year;
    const hour = parts.hour;
    const minute = parts.minute;
    const second = parts.second;
    const dayPeriod = parts.dayPeriod; // AM or PM

    // Ordinal suffix for day (e.g., 1st, 2nd, 3rd)
    const suffix =
        day % 10 === 1 && day !== 11
            ? 'st'
            : day % 10 === 2 && day !== 12
                ? 'nd'
                : day % 10 === 3 && day !== 13
                    ? 'rd'
                    : 'th';

    const humanDate = `${day}${suffix} ${month} ${year}`;
    const numericDate = `${day.toString().padStart(2, '0')}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${year}`;
    const time = `${hour}:${minute}:${second} ${dayPeriod}`;

    return { day, month, year, hour, minute, second, dayPeriod, humanDate, numericDate, time };
}

const utils = {
    isCleanResponse,
    getISTDateTime
};

export default utils;