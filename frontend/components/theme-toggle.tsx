"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      const isDark = savedTheme === "dark";
      queueMicrotask(() => setDark(isDark));
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      // Default to dark theme
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
    const newDark = !dark;
    document.documentElement.classList.toggle("dark", newDark);
    setDark(newDark);
    localStorage.setItem(THEME_KEY, newDark ? "dark" : "light");
  };

  return (
    <Button
      className="hover:cursor-pointer"
      variant="ghost"
      size="icon"
      onClick={toggle}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
