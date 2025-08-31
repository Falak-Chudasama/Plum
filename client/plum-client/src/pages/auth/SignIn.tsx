import components from "../../components/components";

function SignIn() {
    const { WhiteLogo } = components;

    return (
        <div className="h-screen w-screen bg-plum-bg p-4 flex items-center overflow-hidden">
            <div className="h-full w-[47%] 
                p-6 rounded-2xl
                auth-left-bg
            ">
                <WhiteLogo />
                <p className="text-3xl font-light text-plum-bg">
                    I can auto-sort,<br /> summarize, and reply<br /> to your emails
                </p>
            </div>
        </div>
    );
}

export default SignIn;