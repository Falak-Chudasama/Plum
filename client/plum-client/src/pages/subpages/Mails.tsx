import { useEffect } from "react";
import Inbox from "./tabs/Inbox";

function Mails() {

    useEffect(() => {
        document.title = 'Plum | Mails';
    }, [])

    return(
        <div>
            Mails:
            <Inbox />
        </div>
    );
}
export default Mails