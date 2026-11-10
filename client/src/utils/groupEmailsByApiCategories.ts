import type { InboundEmailType, CategoryType } from "../types/types";

const defaultColorMap = {
    gray: { dark: "#616161", light: "#E4E4E4" },
};

function normalizeKey(name: string) {
    return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export function groupEmailsByApiCategories(
    emails: InboundEmailType[],
    apiCategories?: CategoryType[] | null,
    opts?: { preserveKeys?: boolean; uncategorizedKey?: string }
): Record<string, { emails: InboundEmailType[]; color: string }> {
    const preserveKeys = Boolean(opts?.preserveKeys);
    const uncategorizedKey = opts?.uncategorizedKey ?? "other";
    const out: Record<string, { emails: InboundEmailType[]; color: string }> = {};

    function colorFor(catName: string): string {
        if (Array.isArray(apiCategories)) {
            const found = apiCategories.find(
                (c) => normalizeKey(c.category) === normalizeKey(catName)
            );
            if (found && found.color) return found.color;
        }
        return defaultColorMap.gray.dark;
    }

    function epochOf(e: InboundEmailType) {
        if (e.timestamp) {
            const p = Date.parse(e.timestamp);
            if (!isNaN(p)) return p;
        }
        if (e.createdAt) {
            const p = new Date(e.createdAt as any).getTime();
            if (!isNaN(p)) return p;
        }
        return 0;
    }

    const sorted = [...(emails || [])].sort((a, b) => epochOf(b) - epochOf(a));

    for (const mail of sorted) {
        const mailCats = Array.isArray(mail.categories) && mail.categories.length > 0
            ? mail.categories
            : [uncategorizedKey];

        for (const rawName of mailCats) {
            const key = preserveKeys ? rawName : normalizeKey(rawName);
            if (!out[key]) {
                out[key] = { emails: [], color: colorFor(rawName) };
            }
            out[key].emails.push(mail);
        }
    }

    for (const k of Object.keys(out)) {
        if (!out[k].emails || out[k].emails.length === 0) delete out[k];
    }

    return out;
}