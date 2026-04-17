import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme on load (light | neon)
const savedTheme = localStorage.getItem('neoguard-theme') || 'neon';
document.documentElement.classList.remove('dark', 'neon');
if (savedTheme === 'neon') document.documentElement.classList.add('neon');

createRoot(document.getElementById("root")!).render(<App />);
