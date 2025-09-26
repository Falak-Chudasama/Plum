function Attachment({ filename }: { filename: string }) {
    const fileName = filename.toLowerCase();
    const isImageFile = (
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.jpeg') ||
        fileName.endsWith('.png') ||
        fileName.endsWith('.webp') ||
        fileName.endsWith('.svg') ||
        fileName.endsWith('.gif') ||
        fileName.endsWith('.bmp') ||
        fileName.endsWith('.avif') ||
        fileName.endsWith('.heic')
    );

    const icon = isImageFile ? "/img-file-icon.svg" : "/other-file-icon.svg";

    return (
        <button className="flex items-center gap-2 px-3 hover:px-5 py-0.5 w-fit rounded-full bg-plum-secondary text-plum-bg shadow-sm cursor-pointer select-none duration-200">
            <img
                className="h-3 w-auto"
                src={icon}
                alt={`File icon for ${filename}`}
            />
            <p className="text-[12px] max-w-48 truncate">{filename}</p>
        </button>
    );
}

export default Attachment;
