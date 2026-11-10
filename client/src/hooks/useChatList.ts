import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import apis from "../apis/apis";
import utils from "../utils/utils";
import ChatStore from "../store/ChatStore";

const limit = 20;
const staleTime = 60 * 1000;
const refreshTime = 60 * 1000;

function useChatList() {
    const email = utils.parseGmailCookies().gmailCookie;

    const cursor = ChatStore(state => state.chatList.cursor);
    const setChatList = ChatStore(state => state.setChatList);
    const appendChatList = ChatStore(state => state.appendChatList);

    const query = useQuery({
        queryKey: ["chatList", email, limit, cursor],

        queryFn: async ({ queryKey }) => {
            const [_, email, limit, cursor] = queryKey as [
                string,
                string,
                number,
                string | null
            ];

            if (!email || email.trim() === "") {
                return {
                    chats: [],
                    nextCursor: null,
                    hasMore: false
                };
            }

            console.log("queryFn: fetching chats for email:", email, "cursor:", cursor);

            const res = await apis.getChatList(email, limit, cursor);

            console.log(res);

            return (
                res?.result ?? {
                    chats: [],
                    nextCursor: null,
                    hasMore: false
                }
            );
        },

        placeholderData: (previousData) => previousData,
        staleTime,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 2,
        refetchInterval: refreshTime
    });

    useEffect(() => {
        if (!query.data) return;

        const incoming = {
            chats: query.data.chats,
            cursor: query.data.nextCursor,
            hasMore: query.data.hasMore
        };

        if (cursor === null) {
            setChatList(incoming);
        } else {
            appendChatList(incoming);
        }
    }, [query.data, cursor, setChatList, appendChatList]);

    return query;
}

export default useChatList;