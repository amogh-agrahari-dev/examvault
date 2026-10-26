/**
 * Monaco Editor Themes Catalog
 * Includes iconic themes with recognizable color palettes:
 * - One Dark Pro (Atom / VS Code favorite)
 * - Dracula (Vibrant neon palette)
 * - Night Owl (Deep navy & warm pastels)
 * - Monokai (Sublime classic)
 * - GitHub Dark & GitHub Light
 * - Solarized Light
 * - VS Code Dark+ & Light+
 */

export const THEME_DEFINITIONS = {
  "one-dark-pro": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5c6370", fontStyle: "italic" },
      { token: "keyword", foreground: "c678dd" },
      { token: "keyword.control", foreground: "c678dd" },
      { token: "keyword.operator", foreground: "56b6c2" },
      { token: "string", foreground: "98c379" },
      { token: "string.escape", foreground: "56b6c2" },
      { token: "number", foreground: "d19a66" },
      { token: "type", foreground: "e5c07b" },
      { token: "class", foreground: "e5c07b" },
      { token: "function", foreground: "61afef" },
      { token: "variable", foreground: "e06c75" },
      { token: "variable.parameter", foreground: "d19a66" },
      { token: "operator", foreground: "56b6c2" },
      { token: "delimiter", foreground: "abb2bf" },
      { token: "constant", foreground: "d19a66" },
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#abb2bf",
      "editorCursor.foreground": "#528bff",
      "editor.lineHighlightBackground": "#2c313c",
      "editorLineNumber.foreground": "#4b5263",
      "editorLineNumber.activeForeground": "#c8ccd4",
      "editor.selectionBackground": "#3e4451",
      "editor.inactiveSelectionBackground": "#323842",
    },
  },

  "dracula": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6272a4", fontStyle: "italic" },
      { token: "keyword", foreground: "ff79c6" },
      { token: "string", foreground: "f1fa8c" },
      { token: "number", foreground: "bd93f9" },
      { token: "type", foreground: "8be9fd" },
      { token: "class", foreground: "8be9fd" },
      { token: "function", foreground: "50fa7b" },
      { token: "variable", foreground: "f8f8f2" },
      { token: "operator", foreground: "ff79c6" },
      { token: "constant", foreground: "bd93f9" },
      { token: "delimiter", foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background": "#282a36",
      "editor.foreground": "#f8f8f2",
      "editorCursor.foreground": "#f8f8f0",
      "editor.lineHighlightBackground": "#44475a50",
      "editorLineNumber.foreground": "#6272a4",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.selectionBackground": "#44475a",
      "editor.inactiveSelectionBackground": "#3d3f4d",
    },
  },

  "night-owl": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "637777", fontStyle: "italic" },
      { token: "keyword", foreground: "c792ea" },
      { token: "string", foreground: "ecc48d" },
      { token: "number", foreground: "f78c6c" },
      { token: "type", foreground: "ffcb8b" },
      { token: "class", foreground: "ffcb8b" },
      { token: "function", foreground: "82aaff" },
      { token: "variable", foreground: "addb67" },
      { token: "operator", foreground: "7fdbca" },
      { token: "constant", foreground: "82aaff" },
    ],
    colors: {
      "editor.background": "#011627",
      "editor.foreground": "#d6deeb",
      "editorCursor.foreground": "#7e57c2",
      "editor.lineHighlightBackground": "#0b2942",
      "editorLineNumber.foreground": "#4b6479",
      "editorLineNumber.activeForeground": "#c5e4fd",
      "editor.selectionBackground": "#1d3b5a",
      "editor.inactiveSelectionBackground": "#13283c",
    },
  },

  "monokai": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "keyword", foreground: "f92672" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "class", foreground: "a6e22e" },
      { token: "function", foreground: "a6e22e" },
      { token: "variable", foreground: "f8f8f2" },
      { token: "operator", foreground: "f92672" },
      { token: "constant", foreground: "ae81ff" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editorCursor.foreground": "#f8f8f0",
      "editor.lineHighlightBackground": "#3e3d32",
      "editorLineNumber.foreground": "#90908a",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.selectionBackground": "#49483e",
      "editor.inactiveSelectionBackground": "#383830",
    },
  },

  "github-dark": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "type", foreground: "ffa657" },
      { token: "class", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
      { token: "variable", foreground: "c9d1d9" },
      { token: "operator", foreground: "79c0ff" },
      { token: "constant", foreground: "79c0ff" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorCursor.foreground": "#58a6ff",
      "editor.lineHighlightBackground": "#161b22",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#f0f6fc",
      "editor.selectionBackground": "#264f78",
      "editor.inactiveSelectionBackground": "#1f3b58",
    },
  },

  "github-light": {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e7781", fontStyle: "italic" },
      { token: "keyword", foreground: "cf222e" },
      { token: "string", foreground: "0a3069" },
      { token: "number", foreground: "0550ae" },
      { token: "type", foreground: "953800" },
      { token: "class", foreground: "953800" },
      { token: "function", foreground: "8250df" },
      { token: "variable", foreground: "24292f" },
      { token: "operator", foreground: "0550ae" },
      { token: "constant", foreground: "0550ae" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#24292f",
      "editorCursor.foreground": "#0969da",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editorLineNumber.foreground": "#8c959f",
      "editorLineNumber.activeForeground": "#24292f",
      "editor.selectionBackground": "#b6e3ff",
      "editor.inactiveSelectionBackground": "#ddf4ff",
    },
  },

  "solarized-light": {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "93a1a1", fontStyle: "italic" },
      { token: "keyword", foreground: "859900" },
      { token: "string", foreground: "2aa198" },
      { token: "number", foreground: "d33682" },
      { token: "type", foreground: "b58900" },
      { token: "class", foreground: "b58900" },
      { token: "function", foreground: "268bd2" },
      { token: "variable", foreground: "657b83" },
      { token: "operator", foreground: "859900" },
      { token: "constant", foreground: "d33682" },
    ],
    colors: {
      "editor.background": "#fdf6e3",
      "editor.foreground": "#657b83",
      "editorCursor.foreground": "#586e75",
      "editor.lineHighlightBackground": "#eee8d5",
      "editorLineNumber.foreground": "#93a1a1",
      "editorLineNumber.activeForeground": "#586e75",
      "editor.selectionBackground": "#eee8d5",
      "editor.inactiveSelectionBackground": "#f5eed9",
    },
  },
};

export const AVAILABLE_THEMES = [
  // Dark Themes
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    mode: "dark",
    tagline: "Atom & VS Code flagship",
    bg: "#282c34",
    accent: "#61afef",
    dotColors: ["#c678dd", "#61afef", "#98c379"],
  },
  {
    id: "dracula",
    name: "Dracula",
    mode: "dark",
    tagline: "Vibrant neon purples & greens",
    bg: "#282a36",
    accent: "#ff79c6",
    dotColors: ["#ff79c6", "#bd93f9", "#50fa7b"],
  },
  {
    id: "night-owl",
    name: "Night Owl",
    mode: "dark",
    tagline: "Deep navy with vivid pastels",
    bg: "#011627",
    accent: "#82aaff",
    dotColors: ["#c792ea", "#82aaff", "#ecc48d"],
  },
  {
    id: "monokai",
    name: "Monokai",
    mode: "dark",
    tagline: "Classic Sublime colorway",
    bg: "#272822",
    accent: "#a6e22e",
    dotColors: ["#f92672", "#a6e22e", "#66d9ef"],
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    mode: "dark",
    tagline: "Official GitHub midnight slate",
    bg: "#0d1117",
    accent: "#58a6ff",
    dotColors: ["#ff7b72", "#58a6ff", "#79c0ff"],
  },
  {
    id: "vs-dark",
    name: "VS Code Dark+",
    mode: "dark",
    tagline: "Standard Microsoft Dark",
    bg: "#1e1e1e",
    accent: "#007acc",
    dotColors: ["#569cd6", "#4ec9b0", "#ce9178"],
  },

  // Light Themes
  {
    id: "github-light",
    name: "GitHub Light",
    mode: "light",
    tagline: "Clean, high-contrast crisp white",
    bg: "#ffffff",
    accent: "#0969da",
    dotColors: ["#cf222e", "#0969da", "#0a3069"],
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    mode: "light",
    tagline: "Warm parchment & earthy tones",
    bg: "#fdf6e3",
    accent: "#268bd2",
    dotColors: ["#859900", "#268bd2", "#2aa198"],
  },
  {
    id: "vs",
    name: "VS Code Light+",
    mode: "light",
    tagline: "Standard Microsoft Light",
    bg: "#ffffff",
    accent: "#007acc",
    dotColors: ["#0000ff", "#a31515", "#008000"],
  },
];

let themesRegistered = false;

/**
 * Registers all custom themes with Monaco editor
 */
export function registerMonacoThemes(monaco) {
  if (!monaco || themesRegistered) return;
  try {
    Object.entries(THEME_DEFINITIONS).forEach(([themeId, definition]) => {
      monaco.editor.defineTheme(themeId, definition);
    });
    themesRegistered = true;
  } catch (err) {
    console.warn("Could not register Monaco custom themes:", err);
  }
}

/**
 * Get theme object by ID
 */
export function getThemeById(themeId) {
  return AVAILABLE_THEMES.find((t) => t.id === themeId) || AVAILABLE_THEMES[0];
}

/**
 * Get default theme for dark or light mode
 */
export function getDefaultThemeForMode(mode) {
  if (mode === "dark") {
    return "one-dark-pro";
  }
  return "github-light";
}
