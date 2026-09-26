import React, { useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../lib/theme";
import { Sun, Moon } from "../lib/icons";
import "./market.css";

/** The Studio by Insyd wordmark, exactly as in the editor's top bar. */
export const Wordmark: React.FC<{ className?: string }> = ({ className = "" }) => (
  <span className={`mk-wordmark ${className}`}><span className="name">Studio</span><span className="by">by Insyd</span></span>
);

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme((s) => s.theme);
  useEffect(() => { document.title = "Templates · Studio by Insyd"; }, []);
  return (
    <div className="mk" id="mk-scroll">
      <header className="mk-nav">
        <div className="mk-wrap mk-nav-in">
          <Link to="/" className="mk-brand" aria-label="Studio by Insyd — templates"><Wordmark /></Link>
          <nav className="mk-links">
            <NavLink to="/" end>Templates</NavLink>
            <a href="/studio">Studio</a>
            <a href="https://github.com/ishan-crd/Insyd.Studio" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <div className="mk-nav-r">
            <button className="mk-icon" title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => useTheme.getState().toggle()}>{theme === "dark" ? <Sun /> : <Moon />}</button>
            <a className="mk-btn primary sm" href="/studio">Open Studio</a>
          </div>
        </div>
      </header>
      {children}
      <footer className="mk-foot">
        <div className="mk-wrap mk-foot-in">
          <Wordmark />
          <span>Every template is a Remotion project — open it in Studio, let Claude make it yours, export.</span>
        </div>
      </footer>
    </div>
  );
};
