import { useState } from "react";
import { login, signup, type User } from "../utils/auth";
import "../App.css";

interface AuthPageProps {
	onAuth: (user: User) => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
	const [isSignup, setIsSignup] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		const result = isSignup
			? signup(email.trim(), password)
			: login(email.trim(), password);
		if (typeof result === "string") {
			setError(result);
		} else {
			onAuth(result);
		}
	}

	return (
		<div className="page">
			<header className="header">
				<span className="logo">Agenda</span>
			</header>
			<main className="main">
				<div className="card" style={{ maxWidth: 440 }}>
					<div className="card-header">
						<h1 className="card-title">{isSignup ? "Create an account" : "Welcome back"}</h1>
						<p className="card-subtitle">
							{isSignup
								? "Sign up to start planning trips."
								: "Log in to access your trips."}
						</p>
					</div>
					<form onSubmit={handleSubmit}>
						<div className="input-group" style={{ flexDirection: "column" }}>
							<div className="input-bar trip-name-bar">
								<input
									className="text-input trip-name-input"
									type="email"
									placeholder="Email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
							<div className="input-bar trip-name-bar">
								<input
									className="text-input trip-name-input"
									type="password"
									placeholder="Password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
							</div>
						</div>
						{error && (
							<p style={{ color: "var(--red)", fontSize: "0.88rem", marginBottom: 16 }}>{error}</p>
						)}
						<button
							className="create-btn add-btn"
							type="submit"
							disabled={!email.trim() || !password}
						>
							{isSignup ? "Sign Up" : "Log In"}
						</button>
					</form>
					<p style={{ textAlign: "center", marginTop: 20, fontSize: "0.88rem", color: "var(--text-muted)" }}>
						{isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
						<button
							className="auth-toggle-btn"
							onClick={() => { setIsSignup(!isSignup); setError(""); }}
						>
							{isSignup ? "Log in" : "Sign up"}
						</button>
					</p>
				</div>
			</main>
		</div>
	);
}
