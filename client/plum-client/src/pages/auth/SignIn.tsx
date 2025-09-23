import React, { useState, useEffect, useRef } from "react";
import apis from "../../apis/apis";
import { useMutation } from "@tanstack/react-query";
import components from "../../components/components";
import { Link, useNavigate } from "react-router-dom";
import useGmailStore from "../../store/GmailStore";
import utils from "../../utils/utils";

function SignIn(): JSX.Element {
    const { WhiteLogo } = components;
    const [loading, setLoading] = useState(false);
    const { gmail, setGmail } = useGmailStore();
    const navigate = useNavigate();

    const fNameRef = useRef<HTMLInputElement | null>(null);
    const lNameRef = useRef<HTMLInputElement | null>(null);
    const gmailRef = useRef<HTMLInputElement | null>(null);
    const submitRef = useRef<HTMLButtonElement | null>(null);

    const [fNameActive, setFNameActive] = useState(false);
    const [lNameActive, setLNameActive] = useState(false);
    const [emailActive, setEmailActive] = useState(false);

    useEffect(() => {
        document.title = "Plum | Login";
        fNameRef.current?.focus();
    }, []);

    const mutation = useMutation({
        mutationFn: ({ fName, lName, gmail }: { fName: string; lName: string; gmail: string }) =>
            apis.login(gmail, fName, lName),

        onSuccess: (data) => {
            setLoading(false);
            console.log("Login success:", data);
            const { gmailCookie, pictureCookie } = utils.parseGmailCookies();
            setGmail({ gmailId: gmailCookie, profileUrl: pictureCookie });
            navigate(`/home/${gmailCookie}`, { replace: true });
        },

        onError: (err) => {
            setLoading(false);
            console.error("Login failed:", err);
            alert("Login failed. Please try again.");
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!fNameRef.current || !lNameRef.current || !gmailRef.current) return;

        const fName = fNameRef.current.value.trim();
        const lName = lNameRef.current.value.trim();
        const gmailVal = gmailRef.current.value.trim();

        if (!fName || !lName || !gmailVal) {
            alert("Please fill in all fields");
            return;
        }

        setLoading(true);
        mutation.mutate({ gmail: gmailVal, fName, lName });
    };

    const fieldClass = "h-13 border-3 rounded-full relative flex justify-end duration-400";
    const inputClass = "text-lg font-medium bg-transparent outline-none focus:outline-none duration-400";
    const textClass = "text-lg absolute px-1 top-[-1.1rem] left-5 bg-plum-bg duration-400";

    return (
        <div className="h-screen w-screen bg-plum-bg p-4 flex items-center justify-between overflow-hidden relative select-none">
            <div
                className="h-full w-[48%] 
                p-6 rounded-2xl
                auth-left-bg
            "
            >
                <WhiteLogo />
                <p className="text-3xl font-light text-plum-bg absolute bottom-10">
                    I can categorize,
                    <br /> summarize, and reply to
                    <br />
                    your emails
                </p>
            </div>

            <div
                className="h-fit w-[50%] 
                p-6
                grid
                gap-y-15
                place-items-center
            "
            >
                <div className="place-items-center grid gap-y-3">
                    <h1 className="text-plum-secondary font-cabin font-semibold text-6xl">Hello, I'm Plum</h1>
                    <h3 className="text-plum-primary font-extralight font-cabin text-3xl">Your Gmail assistant</h3>
                </div>

                <form className="min-w-90 max-w-100 h-fit grid place-items-center gap-y-4" onSubmit={handleSubmit}>
                    <div className="w-full flex items-center justify-between gap-x-2">
                        {/* first name field */}
                        <div className={`w-1/2 ${fNameActive ? "border-plum-primary" : "border-plum-secondary"} ${fieldClass}`}>
                            <p
                                className={`${textClass} ${
                                    fNameActive ? "text-plum-primary" : "text-plum-secondary"
                                }`}
                            >
                                Name
                            </p>
                            <input
                                required
                                onFocus={() => setFNameActive(true)}
                                onBlur={() => setFNameActive(false)}
                                ref={fNameRef}
                                type="text"
                                maxLength={15}
                                className={`w-7/8 ${fNameActive ? "text-plum-primary" : "text-plum-secondary"} ${inputClass}`}
                                aria-label="First name"
                            />
                        </div>

                        {/* last name field */}
                        <div className={`w-1/2 ${lNameActive ? "border-plum-primary" : "border-plum-secondary"} ${fieldClass}`}>
                            <p
                                className={`${textClass} ${
                                    lNameActive ? "text-plum-primary" : "text-plum-secondary"
                                }`}
                            >
                                Last name
                            </p>
                            <input
                                required
                                onFocus={() => setLNameActive(true)}
                                onBlur={() => setLNameActive(false)}
                                ref={lNameRef}
                                type="text"
                                maxLength={15}
                                className={`w-7/8 ${lNameActive ? "text-plum-primary" : "text-plum-secondary"} ${inputClass}`}
                                aria-label="Last name"
                            />
                        </div>
                    </div>

                    <div className="w-full">
                        {/* email field */}
                        <div className={`w-full ${emailActive ? "border-plum-primary" : "border-plum-secondary"} ${fieldClass}`}>
                            <p
                                className={`${textClass} ${
                                    emailActive ? "text-plum-primary" : "text-plum-secondary"
                                }`}
                            >
                                Gmail address
                            </p>
                            <input
                                onFocus={() => setEmailActive(true)}
                                onBlur={() => setEmailActive(false)}
                                required
                                ref={gmailRef}
                                type="email"
                                className={`w-14/15 ${emailActive ? "text-plum-primary" : "text-plum-secondary"} ${inputClass}`}
                                aria-label="Gmail address"
                            />
                        </div>
                    </div>

                    <div className="grid w-full justify-items-stretch gap-y-2">
                        <button
                            type="submit"
                            ref={submitRef}
                            className="
                        group
                        w-full py-2 hover:bg-plum-surface-hover duration-300 border-plum-secondary border-3
                        bg-plum-surface rounded-full
                        flex justify-center text-2xl text-center font-medium
                        cursor-pointer hover:shadow-plum-surface-xl
                        "
                            disabled={loading || mutation.isLoading}
                            aria-busy={loading || mutation.isLoading}
                        >
                            {loading || mutation.isLoading ? (
                                <span className="flex items-center justify-center gap-2 text-xl font-cabin">
                                    Just a sec...
                                    <span className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full" />
                                </span>
                            ) : (
                                <p className="font-cabin">Login</p>
                            )}
                        </button>

                        <span className="text-center text-lg">
                            <Link to="/signup" className="text-plum-primary underline cursor-pointer">
                                Sign up
                            </Link>{" "}
                            If a new user
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SignIn;