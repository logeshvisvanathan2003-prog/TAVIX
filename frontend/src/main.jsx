import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./auth.jsx";
import "./index.css";
import { initTheme } from "./theme.js";
initTheme();
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>);
