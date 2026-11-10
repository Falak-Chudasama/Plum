import { useQuery } from "@tanstack/react-query";
import apis from "../apis/apis";
import type { InboundEmailType } from "../types/types";
import utils from "../utils/utils";

const staleTime = 5 * 60 * 1000;
const refreshTime = 5 * 60 * 1000;

function useCategories() {
    return useQuery<InboundEmailType[]>({
        queryKey: ["categories"],
        queryFn: async () => {
            const { gmailCookie } = utils.parseGmailCookies();
            console.log("queryFn: fetching emails for: ", gmailCookie);

            const res = await apis.getCategories(gmailCookie);

            res.categories.push({
                category: 'Other',
                color: 'gray',
                alert: false,
                description: ''
            })
            return res.categories ?? [];
        },
        keepPreviousData: true,
        placeholderData: [],
        staleTime,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 2,
        refetchInterval: refreshTime
    });
}

export default useCategories;