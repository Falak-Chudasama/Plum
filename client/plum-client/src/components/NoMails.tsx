function NoMails() {
    return(
        <div className="h-55 w-full grid place-items-center justify-center select-none">
            <div className="grid place-items-center justify-center gap-y-5">
                <img src="/no-mails-icon.svg" alt="no mails icon" />
                <p className="font-cabin text-3xl text-plum-surface">Oopsie! No Mails :(</p>
            </div>
        </div>
    );
}
export default NoMails;