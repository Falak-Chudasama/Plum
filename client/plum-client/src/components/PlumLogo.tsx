type PlumLogoProps = {
    scale: number,
    textBold: boolean
};

function PlumLogo({ scale = 1, textBold= false }: PlumLogoProps) {
    return(
        <div className={`w-fit h-fit flex items-center select-none`} style={ { transform: `scale(${scale})` } } >
            <img className="h-9 mr-0.5" src="/plum-logo.png" alt="plum logo" />
            <div>
                <span className={`text-4xl text-plum-secondary ${textBold ? "font-semibold" : "font-medium"}`}>P</span>
                <span className={`text-4xl text-plum-primary ${textBold ? "font-semibold" : "font-medium"}`}>lum</span>
            </div>
        </div>
    );
}
export default PlumLogo;