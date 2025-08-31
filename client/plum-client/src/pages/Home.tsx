// Home.tsx
import { useParams, Navigate } from "react-router-dom";
import useGmailStore from "../store/GmailStore";

function Home() {
    const { gmail } = useGmailStore();
    const { id } = useParams<{ id: string }>();

    if (!gmail || id !== gmail.gmailId) {
        return <Navigate to={`/login?warning=invalid_id`} replace />;
    }

    return <div>HOME — Welcome {gmail.gmailId}</div>;
}

export default Home;
