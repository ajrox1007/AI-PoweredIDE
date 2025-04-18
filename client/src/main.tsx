import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import "@monaco-editor/react"; // Pre-load Monaco Editor

createRoot(document.getElementById("root")!).render(<App />);
