import apis from "../../apis/apis";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import components from "../../components/components";
import { Link, Navigate } from "react-router-dom";
import useGmailStore from "../../store/GmailStore";

function SignIn() {
    const { WhiteLogo } = components;
    const [loading, setLoading] = useState(false);
    const { gmail, setGmail, removeGmail } = useGmailStore();

    useEffect(() => {
        document.title = 'Plum | Login';
    });

    const handleClick = () => {
        setLoading(true);
        apis.login();
    }

    // const mutation = useMutation({
    //     mutationFn: (gmail: string, fName: string, lName: string) => apis.login(gmail, fName, lName),
    //     onSuccess: (data) => {
    //         const gmail = 
    //         <Navigate to={'/home'} replace />
    //     }
    // })

    return (
        <div className="h-screen w-screen bg-plum-bg p-4 flex items-center justify-between overflow-hidden relative select-none">
            <div className="h-full w-[48%] 
                p-6 rounded-2xl
                auth-left-bg
            ">
                <WhiteLogo />
                <p className="text-3xl font-light text-plum-bg absolute bottom-10">
                    I can auto-sort,<br /> summarize, and reply to<br />your emails
                </p>
            </div>
            <div className="h-fit w-[50%] 
                p-6
                grid
                gap-y-25
                place-items-center
            ">
                <div className="place-items-center grid gap-y-3">
                    <h1 className="text-plum-secondary font-cabin font-semibold text-6xl">
                        Hello, I'm Plum
                    </h1>
                    <h3 className="text-plum-primary font-extralight font-cabin text-3xl">
                        Your Gmail assistant
                    </h3>
                </div>
                <div className="grid justify-center gap-y-2">
                    <button onClick={() => {
                        handleClick();
                    }} className="
                        group
                        py-3 px-20 hover:px-23 hover:bg-plum-surface-hover duration-300 border-plum-secondary border-3
                        bg-plum-surface rounded-full
                        text-2xl text-center
                        cursor-pointer shadow-plum-stock-xs hover:shadow-plum-surface-xl
                        ">
                        {loading ? (
                            <span className="flex items-center gap-2 text-xl font-cabin">
                                Just a sec...
                                <span className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full" />
                            </span>
                        ) : (
                            <p className="font-cabin">
                                Login
                            </p>
                        )}
                    </button>
                    <span className="text-center text-lg">
                        <Link to='/signup' className="text-plum-primary underline cursor-pointer">Sign up</Link> If a new user
                    </span>
                </div>
            </div>
        </div>
    );
}

export default SignIn;