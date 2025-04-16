import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Update document title
document.title = "RemoteControl - Device Management";

createRoot(document.getElementById("root")!).render(<App />);
