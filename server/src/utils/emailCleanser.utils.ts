type Rule = { name: string; pattern: RegExp };

const rules: Rule[] = [
    {
        name: "notification-to-new-announcement",
        pattern: /notification settings[\s\S]*?new announcement/gi,
    },

    {
        name: "google-address-to-end",
        pattern: /google llc\s*1600 amphitheatre parkway,?[\s\S]*/gi,
    },

    {
        name: "follow-us-block",
        pattern: /follow us\s*:?\s*\[image:[^\]]*\][\s\S]*?<http:\/\/www\.nareshwadi\.org\/en>/gi,
    },

    {
        name: "disclaimer-to-end",
        pattern: /disclaimer[\s\S]*?somaiya\.edu[\s\S]*?email-?disclaimer[\s\S]*/gi,
    },
    {
        name: "end-dashes",
        pattern: /(?:\n|^)--\s*$/gm,
    },
];

const emailCleanser = (emailBody: string | undefined): string => {
    if (!emailBody || typeof emailBody !== "string") return "";

    let cleaned = emailBody;
    for (const r of rules) {
        cleaned = cleaned.replace(r.pattern, "");
    }
    // cleaned = cleaned.replace(/\[image:[^\]]*\]/gi, "");
    cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

    return cleaned.trim();
};

export default emailCleanser;
export { rules, Rule };
