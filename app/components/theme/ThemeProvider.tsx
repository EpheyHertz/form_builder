"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

type FlashlightColor = {
  id: string;
  label: string;
  color: string;
  halo: string;
  description: string;
};

type ThemePalette = {
  name: string;
  surfaces: {
    background: string;
    panel: string;
    card: string;
    overlay: string;
    header: string;
    footer: string;
  };
  border: {
    subtle: string;
    strong: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  accent: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  shadows: {
    lg: string;
    xl: string;
  };
  gradients: {
    background: string;
    focal: string;
  };
  flashlights: FlashlightColor[];
};

type ThemeDefinition = {
  palette: ThemePalette;
  variables: Record<string, string>;
};

type ThemeContextValue = {
  mode: ThemeMode;
  palette: ThemePalette;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "flowstudio.theme";

const THEME_DEFINITIONS: Record<ThemeMode, ThemeDefinition> = {
  dark: {
    palette: {
      name: "Midnight Observatory",
      surfaces: {
        background: "#040b18",
        panel: "rgba(8,16,30,0.86)",
        card: "rgba(12,22,40,0.86)",
        overlay: "radial-gradient(circle at top right, rgba(56,189,248,0.22), transparent 65%), radial-gradient(circle at bottom left, rgba(236,72,153,0.16), transparent 60%)",
        header: "rgba(6,14,28,0.82)",
        footer: "rgba(4,10,22,0.88)",
      },
      border: {
        subtle: "rgba(148,163,184,0.22)",
        strong: "rgba(56,189,248,0.42)",
      },
      text: {
        primary: "#E2EAF6",
        secondary: "rgba(226,232,240,0.82)",
        muted: "rgba(148,163,184,0.74)",
        inverse: "#0f172a",
      },
      accent: {
        primary: "rgba(56,189,248,0.86)",
        secondary: "rgba(236,72,153,0.82)",
        tertiary: "rgba(129,140,248,0.78)",
      },
      shadows: {
        lg: "0 28px 85px rgba(8,16,32,0.32)",
        xl: "0 42px 140px rgba(8,16,32,0.45)",
      },
      gradients: {
        background: "radial-gradient(circle at top left, rgba(59,130,246,0.32), transparent 58%), radial-gradient(circle at bottom right, rgba(14,165,233,0.22), transparent 60%)",
        focal: "radial-gradient(circle at center, rgba(14,116,144,0.42), transparent 60%)",
      },
      flashlights: [
        {
          id: "aurora",
          label: "Aurora Beam",
          color: "rgba(56,189,248,0.34)",
          halo: "rgba(56,189,248,0.18)",
          description: "Encodes live response momentum",
        },
        {
          id: "velvet",
          label: "Velvet Pulse",
          color: "rgba(236,72,153,0.28)",
          halo: "rgba(236,72,153,0.16)",
          description: "Highlights share link activity",
        },
        {
          id: "lumen",
          label: "Lumen Drift",
          color: "rgba(129,140,248,0.26)",
          halo: "rgba(129,140,248,0.14)",
          description: "Tracks completion confidence",
        },
      ],
    },
    variables: {
      "--surface-background": "#040b18",
      "--surface-panel": "rgba(8,16,30,0.86)",
      "--surface-card": "rgba(12,22,40,0.86)",
      "--surface-overlay": "radial-gradient(circle at top right, rgba(56,189,248,0.22), transparent 65%), radial-gradient(circle at bottom left, rgba(236,72,153,0.16), transparent 60%)",
      "--surface-header": "rgba(6,14,28,0.82)",
      "--surface-footer": "rgba(4,10,22,0.88)",
      "--border-subtle": "rgba(148,163,184,0.22)",
      "--border-strong": "rgba(56,189,248,0.42)",
      "--text-primary": "#E2EAF6",
      "--text-secondary": "rgba(226,232,240,0.82)",
      "--text-muted": "rgba(148,163,184,0.74)",
      "--text-inverse": "#0f172a",
      "--accent-primary": "rgba(56,189,248,0.86)",
      "--accent-secondary": "rgba(236,72,153,0.82)",
      "--accent-tertiary": "rgba(129,140,248,0.78)",
      "--shadow-lg": "0 28px 85px rgba(8,16,32,0.32)",
      "--shadow-xl": "0 42px 140px rgba(8,16,32,0.45)",
      "--gradient-background": "radial-gradient(circle at top left, rgba(59,130,246,0.32), transparent 58%), radial-gradient(circle at bottom right, rgba(14,165,233,0.22), transparent 60%)",
      "--gradient-focal": "radial-gradient(circle at center, rgba(14,116,144,0.42), transparent 60%)",
      "--flashlight-aurora": "rgba(56,189,248,0.34)",
      "--flashlight-aurora-halo": "rgba(56,189,248,0.18)",
      "--flashlight-velvet": "rgba(236,72,153,0.28)",
      "--flashlight-velvet-halo": "rgba(236,72,153,0.16)",
      "--flashlight-lumen": "rgba(129,140,248,0.26)",
      "--flashlight-lumen-halo": "rgba(129,140,248,0.14)",
    },
  },
  light: {
    palette: {
      name: "Daybreak Studio",
      surfaces: {
        background: "#f7f9ff",
        panel: "rgba(255,255,255,0.94)",
        card: "rgba(255,255,255,0.9)",
        overlay: "radial-gradient(circle at top right, rgba(59,130,246,0.22), transparent 65%), radial-gradient(circle at bottom left, rgba(251,113,133,0.18), transparent 62%)",
        header: "rgba(255,255,255,0.95)",
        footer: "rgba(243,246,255,0.95)",
      },
      border: {
        subtle: "rgba(15,23,42,0.08)",
        strong: "rgba(59,130,246,0.28)",
      },
      text: {
        primary: "#0f172a",
        secondary: "rgba(30,41,59,0.82)",
        muted: "rgba(71,85,105,0.68)",
        inverse: "#f8fafc",
      },
      accent: {
        primary: "rgba(14,165,233,0.82)",
        secondary: "rgba(244,114,182,0.78)",
        tertiary: "rgba(99,102,241,0.76)",
      },
      shadows: {
        lg: "0 24px 70px rgba(15,23,42,0.12)",
        xl: "0 38px 110px rgba(15,23,42,0.18)",
      },
      gradients: {
        background: "radial-gradient(circle at top left, rgba(191,219,254,0.4), transparent 60%), radial-gradient(circle at bottom right, rgba(167,243,208,0.32), transparent 58%)",
        focal: "radial-gradient(circle at center, rgba(244,114,182,0.32), transparent 58%)",
      },
      flashlights: [
        {
          id: "aurora",
          label: "Aurora Beam",
          color: "rgba(14,165,233,0.28)",
          halo: "rgba(14,165,233,0.15)",
          description: "Encodes live response momentum",
        },
        {
          id: "velvet",
          label: "Velvet Pulse",
          color: "rgba(244,114,182,0.24)",
          halo: "rgba(244,114,182,0.12)",
          description: "Highlights share link activity",
        },
        {
          id: "lumen",
          label: "Lumen Drift",
          color: "rgba(129,140,248,0.22)",
          halo: "rgba(129,140,248,0.12)",
          description: "Tracks completion confidence",
        },
      ],
    },
    variables: {
      "--surface-background": "#f7f9ff",
      "--surface-panel": "rgba(255,255,255,0.94)",
      "--surface-card": "rgba(255,255,255,0.9)",
      "--surface-overlay": "radial-gradient(circle at top right, rgba(59,130,246,0.22), transparent 65%), radial-gradient(circle at bottom left, rgba(251,113,133,0.18), transparent 62%)",
      "--surface-header": "rgba(255,255,255,0.95)",
      "--surface-footer": "rgba(243,246,255,0.95)",
      "--border-subtle": "rgba(15,23,42,0.08)",
      "--border-strong": "rgba(59,130,246,0.28)",
      "--text-primary": "#0f172a",
      "--text-secondary": "rgba(30,41,59,0.82)",
      "--text-muted": "rgba(71,85,105,0.68)",
      "--text-inverse": "#f8fafc",
      "--accent-primary": "rgba(14,165,233,0.82)",
      "--accent-secondary": "rgba(244,114,182,0.78)",
      "--accent-tertiary": "rgba(99,102,241,0.76)",
      "--shadow-lg": "0 24px 70px rgba(15,23,42,0.12)",
      "--shadow-xl": "0 38px 110px rgba(15,23,42,0.18)",
      "--gradient-background": "radial-gradient(circle at top left, rgba(191,219,254,0.4), transparent 60%), radial-gradient(circle at bottom right, rgba(167,243,208,0.32), transparent 58%)",
      "--gradient-focal": "radial-gradient(circle at center, rgba(244,114,182,0.32), transparent 58%)",
      "--flashlight-aurora": "rgba(14,165,233,0.28)",
      "--flashlight-aurora-halo": "rgba(14,165,233,0.15)",
      "--flashlight-velvet": "rgba(244,114,182,0.24)",
      "--flashlight-velvet-halo": "rgba(244,114,182,0.12)",
      "--flashlight-lumen": "rgba(129,140,248,0.22)",
      "--flashlight-lumen-halo": "rgba(129,140,248,0.12)",
    },
  },
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialMode());

  const definition = THEME_DEFINITIONS[mode];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    Object.entries(definition.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, definition]);

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      palette: definition.palette,
      toggleTheme,
      setMode,
    }),
    [definition.palette, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function mergeFlashlights(base: FlashlightColor[], dynamic?: FlashlightColor[]) {
  if (!dynamic || dynamic.length === 0) {
    return base;
  }
  const map = new Map<string, FlashlightColor>();
  base.forEach((flash) => map.set(flash.id, flash));
  dynamic.forEach((flash) => map.set(flash.id, flash));
  return Array.from(map.values());
}

export type { ThemePalette, FlashlightColor, ThemeMode };
