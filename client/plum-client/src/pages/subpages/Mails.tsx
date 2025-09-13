import { useEffect } from "react";
import Inbox from "./tabs/Inbox";
import Categorized from "./tabs/Categorized";
import Summary from "./tabs/Summary";
import Threads from "./tabs/Threads";

function Mails() {

    useEffect(() => {
        document.title = 'Plum | Mails';
    }, [])

    return(
        <div>
            Mails
        </div>
    );
}
export default Mails