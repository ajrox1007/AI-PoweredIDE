import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import "@monaco-editor/react"; // Pre-load Monaco Editor

// Reset local storage to fix file display issues
// The version marker will prevent this from running every time
if (!localStorage.getItem('storage-reset-v1')) {
  console.log('Performing one-time storage reset to fix file display issues');
  
  // Clear only the file-system related storage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('file-system')) {
      localStorage.removeItem(key);
    }
  });
  
  localStorage.setItem('storage-reset-v1', 'true');
}

createRoot(document.getElementById("root")!).render(<App />);
