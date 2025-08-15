import googleAuth from "./apis/googleAuth.apis";
import send from "./apis/apis";

export default function App() {
	return (
		<div>
			<button className="block" onClick={() => googleAuth()}>
				Google Button
			</button>
			<button className="block m-5 cursor-pointer" onClick={() => send()}>
				Send Email
			</button>
		</div>
	);
};