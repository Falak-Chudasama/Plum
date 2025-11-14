import { useQuery } from "@tanstack/react-query";
import apis from "../apis/apis";
import type { CraftedMailType } from "../types/types";
import utils from "../utils/utils";

const staleTime = 60 * 1000;
const refreshTime = 60 * 1000;

function useOutboundEmails(day: Date) {
    const dayKey = utils.makeDayKeyFromDate(day);

    return useQuery<CraftedMailType[]>({
        queryKey: ["outboundEmails", dayKey],
        queryFn: async ({ queryKey }) => {
            const key = queryKey[1] as string;
            const [y, m, dd] = key.split("-").map(Number);
            const dt = new Date(y, m - 1, dd);

            console.log("queryFn: fetching OUTBOUND emails for", key);

            const res = await apis.fetchOutboundMailsDate(
                dt.toLocaleString("en-GB", { day: "2-digit" }),
                dt.toLocaleString("en-GB", { month: "long" }),
                dt.toLocaleString("en-GB", { year: "numeric" }).toString()
            );

            return res?.emails ?? [];
        },
        keepPreviousData: true,
        staleTime,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 2,
        refetchInterval: refreshTime
    });
}

export default useOutboundEmails;