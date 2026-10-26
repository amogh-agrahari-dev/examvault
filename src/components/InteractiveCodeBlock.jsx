import React, { useState, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import {
  Play, Copy, Check, Trash2, Code2, Sparkles, ChevronDown,
  Sun, Moon, Wand2, Palette, Maximize2, FileCode2
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { smartFormatCode } from "../utils/codeFormatter";
import { AVAILABLE_THEMES, getThemeById } from "../utils/monacoThemes";

const SUPPORTED_LANGUAGES = [
  { value: "cpp", label: "C++ (GCC)" },
  { value: "c", label: "C" },
  { value: "python", label: "Python 3" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "typescript", label: "TypeScript" },
];

export const CODE_TEMPLATES = [
  {
    id: "fibonacci",
    name: "Fibonacci Search (C++)",
    language: "cpp",
    code: `// Fibonacci Search Algorithm (C++)
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int fibonacciSearch(const vector<int>& arr, int target) {
    int n = arr.size();
    int offset = -1;
    int fm2 = 0;              // (m-2)'th Fibonacci number
    int fm1 = 1;              // (m-1)'th Fibonacci number
    int fm = fm1 + fm2;       // m'th Fibonacci number

    while (fm < n) {
        fm2 = fm1;
        fm1 = fm;
        fm = fm1 + fm2;
    }

    while (fm > 1) {
        int i = min(offset + fm2, n - 1);
        if (arr[i] < target) {
            fm = fm1;
            fm1 = fm2;
            fm2 = fm - fm1;
            offset = i;
        } else if (arr[i] > target) {
            fm = fm2;
            fm1 = fm1 - fm2;
            fm2 = fm - fm1;
        } else {
            return i; // Target found
        }
    }

    if (fm1 && offset + 1 < n && arr[offset + 1] == target) {
        return offset + 1;
    }

    return -1; // Target not found
}

int main() {
    vector<int> arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int target = 23;
    int index = fibonacciSearch(arr, target);
    cout << "Target " << target << " found at index: " << index << endl;
    return 0;
}`
  },
  {
    id: "binary_search",
    name: "Binary Search (C++)",
    language: "cpp",
    code: `// Binary Search (C++)
#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int left = 0;
    int right = arr.size() - 1;

    while (left <= right) {
        int mid = (left + right) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

int main() {
    vector<int> arr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int target = 23;
    int index = binarySearch(arr, target);
    cout << "Target " << target << " found at index: " << index << endl;
    return 0;
}`
  },
  {
    id: "merge_sort",
    name: "Merge Sort (C++)",
    language: "cpp",
    code: `// Merge Sort (C++)
#include <iostream>
using namespace std;

void merge(int a[], int low, int mid, int high) {
    int b[100];
    int i = low, j = mid + 1, k = low;
    while (i <= mid && j <= high) {
        if (a[i] <= a[j]) b[k++] = a[i++];
        else b[k++] = a[j++];
    }
    while (i <= mid) b[k++] = a[i++];
    while (j <= high) b[k++] = a[j++];
    for (i = low; i <= high; i++) a[i] = b[i];
}

void mergeSort(int a[], int low, int high) {
    if (low >= high) return;
    int mid = (low + high) / 2;
    mergeSort(a, low, mid);
    mergeSort(a, mid + 1, high);
    merge(a, low, mid, high);
}

int main() {
    int arr[] = {38, 27, 43, 3, 9, 82, 10};
    int n = sizeof(arr) / sizeof(arr[0]);
    mergeSort(arr, 0, n - 1);
    for (int i = 0; i < n; i++) cout << arr[i] << " ";
    cout << endl;
    return 0;
}`
  },
  {
    id: "quick_sort",
    name: "Quick Sort (C++)",
    language: "cpp",
    code: `// Quick Sort (C++)
#include <iostream>
using namespace std;

void quickSort(int arr[], int low, int high) {
    if (low >= high) return;
    int i = low, j = high;
    int pivot = arr[(low + high) / 2];

    while (i <= j) {
        while (arr[i] < pivot) i++;
        while (arr[j] > pivot) j--;
        if (i <= j) {
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            i++;
            j--;
        }
    }
    if (low < j) quickSort(arr, low, j);
    if (i < high) quickSort(arr, i, high);
}

int main() {
    int arr[] = {35, 12, 49, 18, 77, 60, 23};
    int n = sizeof(arr) / sizeof(arr[0]);
    quickSort(arr, 0, n - 1);
    for (int i = 0; i < n; i++) cout << arr[i] << " ";
    cout << endl;
    return 0;
}`
  }
];

const THEME_STYLES = {
  "one-dark-pro": {
    bg: "#282c34",
    headerBg: "#21252b",
    border: "#3e4451",
    textColor: "#abb2bf",
    isLight: false,
    accent: "#61afef",
  },
  "dracula": {
    bg: "#282a36",
    headerBg: "#1e1f29",
    border: "#44475a",
    textColor: "#f8f8f2",
    isLight: false,
    accent: "#ff79c6",
  },
  "night-owl": {
    bg: "#011627",
    headerBg: "#01121f",
    border: "#1d3b5a",
    textColor: "#d6deeb",
    isLight: false,
    accent: "#82aaff",
  },
  "monokai": {
    bg: "#272822",
    headerBg: "#1e1f1c",
    border: "#3e3d32",
    textColor: "#f8f8f2",
    isLight: false,
    accent: "#a6e22e",
  },
  "github-dark": {
    bg: "#0d1117",
    headerBg: "#161b22",
    border: "#30363d",
    textColor: "#c9d1d9",
    isLight: false,
    accent: "#58a6ff",
  },
  "github-light": {
    bg: "#ffffff",
    headerBg: "#f6f8fa",
    border: "#d0d7de",
    textColor: "#24292f",
    isLight: true,
    accent: "#0969da",
  },
  "solarized-light": {
    bg: "#fdf6e3",
    headerBg: "#eee8d5",
    border: "#d3368220",
    textColor: "#657b83",
    isLight: true,
    accent: "#268bd2",
  },
  "vs": {
    bg: "#ffffff",
    headerBg: "#f3f4f6",
    border: "#e5e7eb",
    textColor: "#1f2937",
    isLight: true,
    accent: "#007acc",
  },
};

export default function InteractiveCodeBlock({
  node,
  updateAttributes,
  extension,
  editor,
  getPos,
  deleteNode,
}) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const paletteRef = useRef(null);
  const templateMenuRef = useRef(null);

  const currentLang = node.attrs?.language || "cpp";
  const storedThemeMode = node.attrs?.themeMode || "auto"; // 'auto' | 'dark' | 'light'
  const storedThemePreset = node.attrs?.themePreset || "one-dark-pro";

  // Effective mode (dark vs light)
  const isLight =
    storedThemeMode === "light"
      ? true
      : storedThemeMode === "dark"
      ? false
      : resolvedTheme !== "dark";

  // Active theme style
  const activeStyle = THEME_STYLES[storedThemePreset] || (
    isLight ? THEME_STYLES["github-light"] : THEME_STYLES["one-dark-pro"]
  );

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target)) {
        setPaletteOpen(false);
      }
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target)) {
        setTemplateMenuOpen(false);
      }
    };
    if (paletteOpen || templateMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [paletteOpen, templateMenuOpen]);

  // Insert standard algorithm template into code block
  const handleSelectTemplate = (tmpl, e) => {
    e.preventDefault();
    e.stopPropagation();
    updateAttributes({ language: tmpl.language || "cpp" });
    if (editor && typeof getPos === "function") {
      try {
        const from = getPos() + 1;
        const to = getPos() + node.nodeSize - 1;
        const tr = editor.state.tr.replaceWith(
          from,
          to,
          editor.state.schema.text(tmpl.code)
        );
        editor.view.dispatch(tr);
      } catch (err) {
        console.warn("Could not insert template into code block:", err);
      }
    }
    setTemplateMenuOpen(false);
  };

  // Toggle Dark <-> Light Mode for this code block
  const handleToggleMode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextMode = isLight ? "dark" : "light";
    const nextPreset = nextMode === "dark" ? "one-dark-pro" : "github-light";
    updateAttributes({
      themeMode: nextMode,
      themePreset: nextPreset,
    });
  };

  // Select specific color theme
  const handleSelectTheme = (themeId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const targetDef = THEME_STYLES[themeId];
    updateAttributes({
      themePreset: themeId,
      themeMode: targetDef.isLight ? "light" : "dark",
    });
    setPaletteOpen(false);
  };

  // Auto-format code contents
  const handleAutoFormat = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const codeText = node.textContent || "";
    if (!codeText.trim()) return;

    const formattedCode = smartFormatCode(codeText, currentLang);
    if (!formattedCode || formattedCode === codeText) {
      setFormatted(true);
      setTimeout(() => setFormatted(false), 1500);
      return;
    }

    if (editor && typeof getPos === "function") {
      try {
        const from = getPos() + 1;
        const to = getPos() + node.nodeSize - 1;
        const tr = editor.state.tr.replaceWith(
          from,
          to,
          formattedCode ? editor.state.schema.text(formattedCode) : []
        );
        editor.view.dispatch(tr);
        setFormatted(true);
        setTimeout(() => setFormatted(false), 2000);
      } catch (err) {
        console.warn("Could not format TipTap code block:", err);
      }
    }
  };

  // Open full Monaco editor modal
  const handleOpenMonacoModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const codeText = node.textContent || "";
    window.dispatchEvent(
      new CustomEvent("examvault:open-monaco-editor", {
        detail: {
          code: codeText,
          language: currentLang,
          themeId: storedThemePreset,
          pos: typeof getPos === "function" ? getPos() : null,
          nodeSize: node.nodeSize,
        },
      })
    );
  };

  // Trigger code simulation
  const handleRunSimulation = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const codeText = node.textContent || "";

    // Auto-detect language if code has C/C++ or JS indicators
    let detectedLang = currentLang || "cpp";
    if (
      /\b(void|int|float|double|char|bool)\b/.test(codeText) ||
      codeText.includes("#include") ||
      codeText.includes("std::") ||
      codeText.includes("cout") ||
      codeText.includes("printf") ||
      codeText.includes("vector<") ||
      codeText.includes("arr[") ||
      codeText.includes("offset")
    ) {
      detectedLang = "cpp";
      updateAttributes({ language: "cpp" });
    } else if (
      /\b(function|const|let|var)\b/.test(codeText) ||
      codeText.includes("console.log")
    ) {
      detectedLang = "javascript";
      updateAttributes({ language: "javascript" });
    }

    // Fire callback if provided on extension
    if (extension?.options?.onRunSimulation) {
      extension.options.onRunSimulation(codeText, detectedLang);
    }

    // Also dispatch global event for decoupled listener in NoteEditor
    window.dispatchEvent(
      new CustomEvent("examvault:simulate-code", {
        detail: {
          code: codeText,
          language: detectedLang,
        },
      })
    );
  };

  // Copy code contents
  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const codeText = node.textContent || "";
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <NodeViewWrapper
      className={`macos-code-card my-4 select-none relative group ${isLight ? "is-light" : ""}`}
      data-mode={isLight ? "light" : "dark"}
      data-theme={storedThemePreset}
      style={{
        boxShadow: isLight
          ? "0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px " + activeStyle.border
          : "0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px " + activeStyle.border,
      }}
    >
      {/* macOS Code Block Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2 select-none flex-wrap gap-2 transition-colors border-b"
        style={{
          backgroundColor: activeStyle.headerBg,
          borderColor: activeStyle.border,
          color: activeStyle.textColor,
        }}
      >
        {/* Left: Code Block Badge, Language Picker & Dark/Light Mode Switch */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 pr-1">
            <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">
              <Code2 size={12} />
            </div>
            <span className="text-[11px] font-semibold tracking-wide uppercase opacity-75 hidden sm:inline">
              Code
            </span>
          </div>

          {/* Language Selector */}
          <div className="relative inline-flex items-center">
            <select
              value={currentLang}
              onChange={(e) => updateAttributes({ language: e.target.value })}
              className={`appearance-none text-[11px] font-semibold px-2 py-0.5 pr-5 rounded-md outline-none cursor-pointer transition-colors border ${
                isLight
                  ? "bg-white/80 hover:bg-white text-slate-800 border-slate-300 shadow-xs"
                  : "bg-white/10 hover:bg-white/15 text-slate-200 border-white/10"
              }`}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.value}
                  value={lang.value}
                  className={isLight ? "bg-white text-slate-900" : "bg-[#1e1e24] text-white"}
                >
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 pointer-events-none opacity-60" />
          </div>

          {/* Dark <-> Light Mode Toggle */}
          <button
            type="button"
            contentEditable={false}
            onClick={handleToggleMode}
            className={`p-1 rounded-md border text-xs transition-all active:scale-95 ${
              isLight
                ? "bg-white/80 hover:bg-white text-slate-700 border-slate-300 shadow-xs"
                : "bg-white/10 hover:bg-white/15 text-amber-300 border-white/10"
            }`}
            title={`Switch to ${isLight ? "Dark" : "Light"} Mode`}
          >
            {isLight ? <Moon size={11} className="text-indigo-600" /> : <Sun size={11} className="text-amber-400" />}
          </button>

          {/* Algorithm Templates Selector */}
          <div className="relative" ref={templateMenuRef}>
            <button
              type="button"
              contentEditable={false}
              onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all active:scale-95 ${
                isLight
                  ? "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 shadow-xs"
                  : "bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border-sky-500/30"
              }`}
              title="Insert Runnable Algorithm Template"
            >
              <FileCode2 size={11} className="text-sky-500" />
              <span>Templates</span>
              <ChevronDown size={9} className="opacity-60" />
            </button>

            {templateMenuOpen && (
              <div
                className={`absolute left-0 mt-1.5 w-56 py-1.5 rounded-xl border shadow-xl z-50 animate-fade-in text-xs ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-900"
                    : "bg-[#1e1e24] border-white/10 text-white"
                }`}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Runnable C++ Formats
                </div>
                {CODE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={(e) => handleSelectTemplate(tmpl, e)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Code2 size={12} className="text-sky-500" />
                      <span className="font-medium">{tmpl.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions (Theme Palette + Auto-Format + Monaco Modal + Run Simulation + Copy + Delete) */}
        <div className="flex items-center gap-1.5">
          {/* Colors You Know / Palette Selector */}
          <div className="relative" ref={paletteRef}>
            <button
              type="button"
              contentEditable={false}
              onClick={() => setPaletteOpen(!paletteOpen)}
              className={`p-1 rounded-md border text-xs transition-all flex items-center gap-1 ${
                isLight
                  ? "bg-white/80 hover:bg-white text-slate-700 border-slate-300 shadow-xs"
                  : "bg-white/10 hover:bg-white/15 text-slate-200 border-white/10"
              }`}
              title="Colors & Theme Palette"
            >
              <Palette size={11} className="text-amber-400" />
              <ChevronDown size={9} className="opacity-60" />
            </button>

            {paletteOpen && (
              <div
                className={`absolute right-0 mt-2 w-48 py-1.5 rounded-xl border shadow-xl z-50 animate-fade-in text-xs ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-900"
                    : "bg-[#1e1e24] border-white/10 text-white"
                }`}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Dark Themes
                </div>
                {AVAILABLE_THEMES.filter((t) => t.mode === "dark").map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={(e) => handleSelectTheme(t.id, e)}
                    className={`w-full px-3 py-1 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                      storedThemePreset === t.id ? "font-bold text-[var(--accent)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.accent }} />
                      <span>{t.name}</span>
                    </div>
                    {storedThemePreset === t.id && <Check size={11} className="text-emerald-500" />}
                  </button>
                ))}

                <div className="px-3 py-1 mt-1 text-[10px] font-bold uppercase tracking-wider opacity-60 border-t border-black/5 dark:border-white/10 pt-1">
                  Light Themes
                </div>
                {AVAILABLE_THEMES.filter((t) => t.mode === "light").map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={(e) => handleSelectTheme(t.id, e)}
                    className={`w-full px-3 py-1 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                      storedThemePreset === t.id ? "font-bold text-[var(--accent)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.accent }} />
                      <span>{t.name}</span>
                    </div>
                    {storedThemePreset === t.id && <Check size={11} className="text-emerald-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AUTO-FORMAT BUTTON */}
          <button
            type="button"
            contentEditable={false}
            onClick={handleAutoFormat}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all active:scale-95 ${
              formatted
                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                : isLight
                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 shadow-xs"
                : "bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border-amber-500/30"
            }`}
            title="Auto-format Code"
          >
            {formatted ? (
              <>
                <Check size={10} className="text-white" />
                <span>Formatted!</span>
              </>
            ) : (
              <>
                <Wand2 size={10} className="text-amber-500" />
                <span>Format</span>
              </>
            )}
          </button>

          {/* OPEN MONACO EDITOR / FULL EDITOR BUTTON */}
          <button
            type="button"
            contentEditable={false}
            onClick={handleOpenMonacoModal}
            className={`p-1.5 rounded-md border text-xs transition-all ${
              isLight
                ? "bg-white/80 hover:bg-white text-slate-700 border-slate-300 hover:text-[var(--accent)] shadow-xs"
                : "bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border-white/10"
            }`}
            title="Open in Full Monaco Editor with Autocomplete & Themes"
          >
            <Maximize2 size={12} />
          </button>

          {/* Main "Run Simulation" Button (ExamVault Accent) */}
          <button
            type="button"
            contentEditable={false}
            onClick={handleRunSimulation}
            className="sa-btn-accent flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold shadow-xs transition-all active:scale-95"
            title="Launch Interactive Step-by-Step Code Execution Simulator"
          >
            <Play size={11} className="fill-current" />
            <span>Simulate</span>
            <Sparkles size={11} />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            contentEditable={false}
            onClick={handleCopy}
            className={`p-1 rounded-md border transition-colors ${
              isLight
                ? "bg-white/80 hover:bg-white text-slate-700 border-slate-300 shadow-xs"
                : "bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border-white/10"
            }`}
            title="Copy code"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>

          {/* Delete Block Button */}
          {deleteNode && (
            <button
              type="button"
              contentEditable={false}
              onClick={deleteNode}
              className={`p-1 rounded-md border transition-colors ${
                isLight
                  ? "bg-white/80 hover:bg-white text-slate-600 hover:text-red-600 border-slate-300 shadow-xs"
                  : "bg-white/10 hover:bg-white/15 text-slate-400 hover:text-red-400 border-white/10"
              }`}
              title="Remove Code Block"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Code Area */}
      <pre
        className="p-4 rounded-b-xl overflow-x-auto font-mono text-xs md:text-sm leading-relaxed outline-none transition-colors"
        style={{
          backgroundColor: activeStyle.bg,
          color: activeStyle.textColor,
        }}
      >
        <NodeViewContent
          as="code"
          className={`outline-none block select-text font-mono hljs language-${currentLang}`}
        />
      </pre>
    </NodeViewWrapper>
  );
}
