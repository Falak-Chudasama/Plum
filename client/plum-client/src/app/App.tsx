import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "../pages/auth/SignIn";
import SignUp from "../pages/auth/SignUp";
import Error from "../pages/Error";
import Home from "../pages/Home";
import AlertPopupContainer from "../components/AlertPopup";

export default function App() {
	return (
		<>
			<AlertPopupContainer></AlertPopupContainer>
			<Routes>
				<Route path="/signup" element={<SignUp />} />
				<Route path="/signup?warning=:warning" element={<SignUp />} />

				<Route path="/login" element={<SignIn />} />
				<Route path="/login?warning=:warning" element={<SignIn />} />
				<Route path="/signin" element={<SignIn />} />
				<Route path="/signin?warning=:warning" element={<SignIn />} />

				<Route path="/error" element={<Error />} />

				<Route path="/home/:id" element={<Home />} />
				<Route path="/home" element={<Home />} />
				<Route path="/" element={<Home />} />

				<Route path="*" element={<Navigate to="/error" replace />} />
			</Routes>
		</>
	);
}
