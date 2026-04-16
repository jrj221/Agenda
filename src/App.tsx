import { useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Layout } from "./components/Layout";
import { getSession, type User } from "./utils/auth";

function App() {
	const [user, setUser] = useState<User | null>(getSession);

	if (!user) return <AuthPage onAuth={setUser} />;
	return <Layout user={user} onLogout={() => setUser(null)} />;
}

export default App;
