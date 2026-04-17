import "../App.css";

interface LoadingScreenProps {
	message?: string;
}

export function LoadingScreen({ message = "Loading your trips…" }: LoadingScreenProps) {
	return (
		<div className="page">
			<header className="header">
				<span className="logo">Agenda</span>
			</header>
			<main className="main">
				<div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
					<div className="card-header">
						<h1 className="card-title">{message}</h1>
					</div>
				</div>
			</main>
		</div>
	);
}
