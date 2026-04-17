import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = localStorage.getItem('neoguard-theme') || 'neon';
document.documentElement.classList.remove('dark', 'neon');
if (savedTheme === 'neon' || savedTheme === 'dark') {
  document.documentElement.classList.add('neon');
  if (savedTheme === 'dark') localStorage.setItem('neoguard-theme', 'neon');
}

createRoot(document.getElementById("root")!).render(<App />);
