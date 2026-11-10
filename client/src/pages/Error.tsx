import { useEffect } from "react";

function Error() {
    useEffect(() => {
        document.title = 'Plum';
    });

    return (
        <div>
            ERROR
        </div>
    )
}

export default Error;