import apis from "../../apis/apis";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import components from "../../components/components";
import { Link, Navigate } from "react-router-dom";
import useGmailStore from "../../store/GmailStore";

function SignIn() {
    const { WhiteLogo } = components;
    const [loading, setLoading] = useState(false);
    const { gmail, setGmail, removeGmail } = useGmailStore();
    const fNameRef = useRef<HTMLInputElement | null>(null);
    const lNameRef = useRef<HTMLInputElement | null>(null);
    const gmailRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        document.title = 'Plum | Login';
    });

    const mutation = useMutation({
        mutationFn: ({ fName, lName, gmail }: { fName: string; lName: string; gmail: string }) =>
            apis.login(gmail, fName, lName),

        onSuccess: (data) => {
            console.log("Login success:", data);
            // store gmail in Zustand
            // navigate to home
        },

        onError: (err) => {
            console.error("Login failed:", err);
            alert("Login failed. Please try again.");
        },
    });

    const handleClick = () => {
        if (!fNameRef.current || !lNameRef.current || !gmailRef.current) return;
        setLoading(true);

        const fName = fNameRef.current.value.trim();
        const lName = lNameRef.current.value.trim();
        const gmail = gmailRef.current.value.trim();

        if (!fName || !lName || !gmail) {
            alert("Please fill in all fields");
            return;
        }

        mutation.mutate({ fName, lName, gmail });
    }

    const fieldClass = 'h-13 border-3 border-plum-secondary rounded-full relative flex justify-end';
    const inputClass = 'text-lg font-medium text-plum-secondary bg-transparent outline-none focus:outline-none';

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
                gap-y-15
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
                <div className="min-w-90 max-w-100 h-fit grid place-items-center gap-y-4">
                    <div className="w-full flex items-center justify-between gap-x-2">
                        <div className={`w-1/2 ${fieldClass}`}>
                            <p className="text-lg absolute px-1 top-[-1.1rem] left-5 bg-plum-bg">Name</p>
                            <input ref={fNameRef} type="text" maxLength={15} className={`w-7/8 ${inputClass}`} />
                        </div>
                        <div className={`w-1/2 ${fieldClass}`}>
                            <p className="text-lg absolute px-1 top-[-1.1rem] left-5 bg-plum-bg">Last name</p>
                            <input ref={lNameRef} type="text" maxLength={15} className={`w-7/8 ${inputClass}`} />
                        </div>
                    </div>
                    <div className="w-full">
                        <div className={`w-full ${fieldClass}`}>
                            <p className="text-lg absolute px-1 top-[-1.1rem] left-5 bg-plum-bg">Gmail address</p>
                            <input ref={gmailRef} type="email" className={`w-14/15 ${inputClass}`} />
                        </div>
                    </div>
                    <div className="grid w-full justify-items-stretch gap-y-2">
                        <button onClick={() => {
                            handleClick();
                        }} className="
                        group
                        w-full py-2 hover:bg-plum-surface-hover duration-300 border-plum-secondary border-3
                        bg-plum-surface rounded-full
                        flex justify-center text-2xl text-center font-medium
                        cursor-pointer shadow-plum-stock-xs hover:shadow-plum-surface-xl
                        ">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2 text-xl font-cabin">
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
        </div>
    );
}

export default SignIn;