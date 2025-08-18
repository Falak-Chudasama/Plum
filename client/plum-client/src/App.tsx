import googleAuth from "./apis/googleAuth.apis";
import send from "./apis/apis";

export default function App() {
	return (
		<div className="text-2xl">
			<button className="block" onClick={() => googleAuth()}>
				Google Button
			</button>
			<button className="block m-5 cursor-pointer" onClick={() => send()}>
				Send Email
			</button>
			<img src="./plum-logo.png" className="h-50 w-auto" alt="" />
		</div>
	);
};