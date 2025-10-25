import { useQuery } from "@tanstack/react-query";
import apis from "../apis/apis";

const staleTime = 5 * 60 * 1000;
const refreshTime = 5 * 60 * 1000;

function useUser() {
    return useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            const res = await apis.getUser();
            return res.user ?? null;
        },
        placeholderData: null,
        staleTime,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 2,
        refetchInterval: refreshTime
    });
}

export default useUser;