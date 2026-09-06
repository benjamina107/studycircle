"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return <section className="workspace-panel appearance-settings" aria-labelledby="appearance-title">
    <h2 id="appearance-title" className="workspace-section-title">Appearance</h2>
    <div className="appearance-row">
      <div><label htmlFor="dark-mode" className="appearance-label">Dark mode</label><p id="theme-description" className="workspace-hint">A softer, darker palette for late-night study sessions. Saved on this browser.</p></div>
      <button id="dark-mode" type="button" role="switch" aria-checked={theme === "dark"} aria-describedby="theme-description" aria-label="Dark mode" className="theme-switch" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span /></button>
    </div>
  </section>;
}
