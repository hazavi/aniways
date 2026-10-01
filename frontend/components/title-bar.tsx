"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Home,
  RefreshCw,
  Minus,
  Square,
  X,
  Maximize2,
} from "lucide-react";

export function TitleBar() {
  const [isElectron, setIsElectron] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
      queueMicrotask(() => setIsElectron(true));

      // Add class to enable electron-specific styles
      document.documentElement.classList.add("electron");

      // Listen for navigation state updates
      window.electronAPI.onNavigationState?.((state) => {
        setCanGoBack(state.canGoBack);
        setCanGoForward(state.canGoForward);
      });

      // Listen for maximize state updates
      window.electronAPI.onMaximizeChange?.((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }
  }, []);

  // Don't render if not in Electron
  if (!isElectron) {
    return null;
  }

  const handleGoBack = () => {
    window.electronAPI?.goBack();
  };

  const handleGoForward = () => {
    window.electronAPI?.goForward();
  };

  const handleGoHome = () => {
    window.electronAPI?.goHome();
  };

  const handleReload = () => {
    setIsReloading(true);
    window.electronAPI?.forceReload();
    setTimeout(() => setIsReloading(false), 1000);
  };

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 h-9 bg-background border-b border-border/50 flex items-center justify-between select-none z-[100]"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Left side - App icon and navigation */}
      <div
        className="flex items-center gap-1 px-2 h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* Navigation buttons */}
        <button
          onClick={handleGoBack}
          className={`p-1.5 rounded transition-colors ${
            canGoBack
              ? "hover:bg-accent/50 text-foreground"
              : "text-muted-foreground/40 cursor-not-allowed"
          }`}
          title="Back (Alt+Left)"
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleGoForward}
          className={`p-1.5 rounded transition-colors ${
            canGoForward
              ? "hover:bg-accent/50 text-foreground"
              : "text-muted-foreground/40 cursor-not-allowed"
          }`}
          title="Forward (Alt+Right)"
          disabled={!canGoForward}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={handleGoHome}
          className="p-1.5 rounded hover:bg-accent/50 transition-colors"
          title="Home"
        >
          <Home className="h-4 w-4" />
        </button>
        <button
          onClick={handleReload}
          className="p-1.5 rounded hover:bg-accent/50 transition-colors"
          title="Reload (Ctrl+R)"
          disabled={isReloading}
        >
          <RefreshCw
            className={`h-4 w-4 ${isReloading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Center - Title (draggable area) */}
      <div className="flex-1 text-center text-sm text-muted-foreground font-medium truncate px-4">
        Aniways
      </div>

      {/* Right side - Window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="h-full px-3 hover:bg-accent/50 transition-colors flex items-center justify-center"
          title="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-3 hover:bg-accent/50 transition-colors flex items-center justify-center"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-3 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
