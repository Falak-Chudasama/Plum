import useUser from "../hooks/useUser";

function ChatBanner(getToTop: boolean) {
    const { data: user, isLoading } = useUser();

    if (isLoading) return;

    return(
        <div className={`h-fit w-full place-items-center p-2 m-1 select-none duration-300 ${getToTop ? 'translate-y-[20vh]' : '-translate-y-[20vh]'}`}>
            <div className="flex items-center justify-center gap-3 font-cabin text-6xl scale-115">
                <span>
                    <img src="../plum-logo.png" alt="plum logo" className="h-15 w-auto" />
                </span>
                <span>
                    Howdy
                </span>
                <span className="text-plum-primary">
                    { user.name ?? 'User' }
                </span>
            </div>
            <div className="text-xl font-light mt-5 scale-110">
                Want me to 
                <span className="m-1 font-normal text-plum-primary">
                    fetch
                </span>
                or
                <span className="m-1 font-normal text-plum-primary">
                    send
                </span>
                emails?
            </div>
        </div>
    );
}

export default ChatBanner;