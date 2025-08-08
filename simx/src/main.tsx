import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/App.tsx"
import * as extension from "@/extension";
import "./index.scss"

extension.startup();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
