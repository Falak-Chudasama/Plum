import { useEffect } from "react";

function Outbox() {

    useEffect(() => {
        document.title = 'Plum | Outbox';
    }, [])

    return(
        <div>
            Outbox
        </div>
    );
}
export default Outbox