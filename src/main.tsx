import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Punto de entrada: monta la aplicacion principal en el contenedor #root del HTML.
createRoot(document.getElementById("root")!).render(<App />);


