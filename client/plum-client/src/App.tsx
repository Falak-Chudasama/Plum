import apis from "./apis/apis";

export default function App() {
	return (
		<div className="text-2xl">
			<button className="block" onClick={() => apis.googleAuth()}>
				Google Button
			</button>
			<img src="./plum-logo.png" className="h-50 w-auto" alt="" />
		</div>
	);
};