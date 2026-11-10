import { useEffect, useState } from "react";
import components from "../../components/components";
import apis from "../../apis/apis";
import { Link } from "react-router-dom";

function SignUp() {
    const { WhiteLogo } = components;
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document.title = 'Plum | Signup';
    });

    const handleClick = () => {
        setLoading(true);
        apis.googleAuth();
    }

    return (
        <div className="h-screen w-screen bg-plum-bg p-4 flex items-center justify-between overflow-hidden relative select-none">
            <div className="h-full w-[48%] 
                p-6 rounded-2xl
                auth-left-bg
            ">
                <WhiteLogo />
                <p className="text-3xl font-light text-plum-bg absolute bottom-10">
                    I can categorize,<br /> summarize, and reply to<br />your emails
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
                        py-2 px-20 hover:px-23 hover:bg-plum-surface-hover duration-300 border-plum-secondary border-3
                        bg-plum-surface rounded-full
                        text-2xl text-center font-medium
                        cursor-pointer hover:shadow-plum-surface-xl
                        ">
                        {loading ? (
                            <span className="flex items-center gap-2 text-xl font-cabin">
                                Just a sec...
                                <span className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full" />
                            </span>
                        ) : (
                            <>
                                Continue with
                                <img className="h-7 inline ml-2" src="./google-icon.png" alt="google icon" />
                            </>
                        )}
                    </button>
                    <span className="text-center text-lg">
                        <Link to='/signin' className="text-plum-primary underline cursor-pointer">Sign in</Link> If already a user
                    </span>
                </div>
            </div>
        </div>
    );
}

export default SignUp;