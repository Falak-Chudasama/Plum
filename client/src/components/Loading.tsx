function Loading() {
    return(
        <div className="h-50 w-full grid place-items-center justify-center select-none">
            <div className="grid place-items-center justify-center gap-y-3">
                <span className="animate-spin h-10 w-10 border-3 border-t-transparent rounded-full border-plum-surface" />
                <p className="font-cabin text-2xl text-plum-surface">Loading...</p>
            </div>
        </div>
    );
}
export default Loading;