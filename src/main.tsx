import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
if (typeof window !== "undefined") {
  console.log(
    "%cBUNT RGB\nEngineered by Edgardo Maxia",
    "color:#fff;background:#000;padding:8px 12px;border-radius:6px;font-weight:600;"
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
