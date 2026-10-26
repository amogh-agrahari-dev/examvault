import React, { useState, useEffect, useRef, useMemo } from "react";
import Editor, { loader } from "@monaco-editor/react";
import {
  Play, Terminal, CheckCircle2, AlertCircle, Clock, Copy, Check,
  ChevronDown, ChevronUp, Sun, Moon, Wand2, Sparkles, RotateCcw,
  ZoomIn, ZoomOut, Palette, Code2, Layers
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import {
  AVAILABLE_THEMES,
  registerMonacoThemes,
  getThemeById,
  getDefaultThemeForMode
} from "../utils/monacoThemes";
import { formatMonacoDocument, smartFormatCode } from "../utils/codeFormatter";

// Pre-register themes as soon as Monaco loader is initialized
if (typeof window !== "undefined") {
  loader.init().then((monaco) => {
    registerMonacoThemes(monaco);
  }).catch(() => {});
}

const SUPPORTED_LANGUAGES = [
  { value: "cpp", label: "C++ (GCC)" },
  { value: "c", label: "C" },
  { value: "python", label: "Python 3" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "typescript", label: "TypeScript" },
];

export default function CodingWorkspace({
  question,
  value,
  onChange,
  onRun,
  defaultLanguage = "cpp"
}) {
  const { resolvedTheme } = useTheme();

  // Mode state: 'dark' or 'light'
  const [editorMode, setEditorMode] = useState(() => {
    try {
      const saved = localStorage.getItem("examvault_editor_mode");
      if (saved === "dark" || saved === "light") return saved;
    } catch (_) {}
    return resolvedTheme === "dark" ? "dark" : "light";
  });

  // Keep editor mode in sync with global theme unless manually overridden
  useEffect(() => {
    const saved = localStorage.getItem("examvault_editor_mode");
    if (!saved) {
      setEditorMode(resolvedTheme === "dark" ? "dark" : "light");
    }
  }, [resolvedTheme]);

  // Selected Theme ID
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem("examvault_editor_theme");
      if (saved && AVAILABLE_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch (_) {}
    return getDefaultThemeForMode(editorMode);
  });

  // Selected language
  const [language, setLanguage] = useState(defaultLanguage);

  // Editor instances
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Editor states
  const [fontSize, setFontSize] = useState(13);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [formattedJustNow, setFormattedJustNow] = useState(false);
  const themeMenuRef = useRef(null);

  // Runtime state
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', 'timeout'

  // Close theme menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuOpen(false);
      }
    };
    if (themeMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [themeMenuOpen]);

  // Handle Monaco mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register all iconic custom themes
    registerMonacoThemes(monaco);

    // Apply active theme
    monaco.editor.setTheme(currentThemeId);

    // Track cursor movements
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });

    // Add keyboard shortcut for formatting: Shift + Alt + F
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => {
        handleAutoFormat();
      }
    );
  };

  // Toggle Dark <-> Light Mode
  const handleToggleMode = () => {
    const nextMode = editorMode === "dark" ? "light" : "dark";
    setEditorMode(nextMode);
    localStorage.setItem("examvault_editor_mode", nextMode);

    // Switch to appropriate theme for mode
    const targetTheme = getDefaultThemeForMode(nextMode);
    setCurrentThemeId(targetTheme);
    localStorage.setItem("examvault_editor_theme", targetTheme);

    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(targetTheme);
    }
  };

  // Switch specific theme
  const handleSelectTheme = (theme) => {
    setCurrentThemeId(theme.id);
    setEditorMode(theme.mode);
    localStorage.setItem("examvault_editor_theme", theme.id);
    localStorage.setItem("examvault_editor_mode", theme.mode);
    setThemeMenuOpen(false);

    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme.id);
    }
  };

  // Auto-format code
  const handleAutoFormat = async () => {
    if (!editorRef.current || !monacoRef.current) {
      // Fallback if editor not mounted yet
      const formatted = smartFormatCode(value, language);
      onChange(formatted);
      triggerFormatSuccess();
      return;
    }

    const success = await formatMonacoDocument(
      editorRef.current,
      monacoRef.current,
      language
    );

    if (success) {
      triggerFormatSuccess();
    } else {
      // Direct text fallback
      const currentVal = editorRef.current.getValue();
      const formatted = smartFormatCode(currentVal, language);
      if (formatted && formatted !== currentVal) {
        editorRef.current.setValue(formatted);
        triggerFormatSuccess();
      }
    }
  };

  const triggerFormatSuccess = () => {
    setFormattedJustNow(true);
    setTimeout(() => setFormattedJustNow(false), 2000);
  };

  // Copy source code
  const handleCopyCode = () => {
    const code = editorRef.current ? editorRef.current.getValue() : value;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Clear / Reset code
  const handleResetCode = () => {
    if (window.confirm("Clear and reset editor contents?")) {
      onChange("");
      if (editorRef.current) {
        editorRef.current.setValue("");
      }
    }
  };

  // Run code handler
  const handleRun = async () => {
    setRunning(true);
    setStatus(null);
    try {
      const codeToRun = editorRef.current ? editorRef.current.getValue() : value;
      const res = await onRun(codeToRun, stdin);
      let text = "";
      if (res.output && res.error) {
        text = `${res.output}\n\n[Standard Error / Traceback]:\n${res.error}`;
      } else {
        text = res.output || res.error || "Executed successfully with no output.";
      }
      setOutput(text);
      setStatus(res.status || (res.error ? "error" : "success"));
    } catch (e) {
      setOutput(e.message || "Execution failed.");
      setStatus("error");
    } finally {
      setRunning(false);
    }
  };

  const copyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const currentThemeObj = useMemo(
    () => getThemeById(currentThemeId),
    [currentThemeId]
  );

  return (
    <div className="flex flex-col gap-3 mt-4 select-none">
      {/* =========================================================================
          macOS / Modern IDE Toolbar
          ========================================================================= */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-xl border transition-colors flex-wrap gap-2 shadow-xs ${
        editorMode === "dark"
          ? "bg-[#1e1e24] border-[#2e2e38] text-slate-200"
          : "bg-[#f8f9fa] border-[#e2e8f0] text-slate-800"
      }`}>
        {/* Left: Window Controls, Language Picker & Sandbox status */}
        <div className="flex items-center gap-3">
          {/* macOS Traffic Lights */}
          <div className="flex items-center gap-1.5 opacity-85">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block shadow-xs" />
          </div>

          {/* Language Selector */}
          <div className="relative inline-flex items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`appearance-none text-xs font-semibold px-2.5 py-1 pr-6 rounded-md border outline-none cursor-pointer transition-colors ${
                editorMode === "dark"
                  ? "bg-white/10 hover:bg-white/15 border-white/10 text-white"
                  : "bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-xs"
              }`}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.value}
                  value={lang.value}
                  className={editorMode === "dark" ? "bg-[#1e1e24] text-white" : "bg-white text-slate-900"}
                >
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 pointer-events-none opacity-60" />
          </div>

          {/* Isolated Sandbox indicator */}
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] opacity-75">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Isolated Sandbox</span>
          </span>
        </div>

        {/* Center / Right: Theme Selector, Dark/Light Mode, Auto Format & Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap sa-scroll max-w-full py-0.5 flex-nowrap">
          {/* Quick Dark <-> Light Mode Switch */}
          <button
            type="button"
            onClick={handleToggleMode}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
              editorMode === "dark"
                ? "bg-white/10 hover:bg-white/15 border-white/10 text-amber-300 hover:text-amber-200"
                : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900 shadow-xs"
            }`}
            title={`Switch to ${editorMode === "dark" ? "Light" : "Dark"} Mode`}
          >
            {editorMode === "dark" ? (
              <>
                <Sun size={13} className="text-amber-400" />
                <span className="text-[11px] hidden md:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={13} className="text-indigo-600" />
                <span className="text-[11px] hidden md:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* Iconic Color Themes Dropdown */}
          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                editorMode === "dark"
                  ? "bg-white/10 hover:bg-white/15 border-white/10 text-slate-200"
                  : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs"
              }`}
              title="Select Code Editor Color Palette"
            >
              <Palette size={12} className="text-amber-400" />
              <span className="text-[11px] max-w-[85px] sm:max-w-none truncate">{currentThemeObj.name}</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {themeMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-56 py-2 rounded-xl border shadow-2xl z-50 animate-fade-in ${
                  editorMode === "dark"
                    ? "bg-[#18181f] border-white/10 text-white"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Dark Palettes (Famous Colors)
                </div>
                {AVAILABLE_THEMES.filter((t) => t.mode === "dark").map((theme) => {
                  const isSelected = theme.id === currentThemeId;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme)}
                      className={`w-full px-3 py-1.5 text-xs flex items-center justify-between transition-colors text-left ${
                        isSelected
                          ? editorMode === "dark"
                            ? "bg-white/15 text-white font-semibold"
                            : "bg-slate-100 text-slate-900 font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/10 opacity-85"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Preview color dots */}
                        <div className="flex items-center gap-0.5">
                          {theme.dotColors?.map((c, i) => (
                            <span
                              key={i}
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span>{theme.name}</span>
                      </div>
                      {isSelected && <Check size={12} className="text-emerald-400" />}
                    </button>
                  );
                })}

                <div className="px-3 py-1 mt-2 text-[10px] font-bold uppercase tracking-wider opacity-60 border-t border-black/5 dark:border-white/10 pt-2">
                  Light Palettes
                </div>
                {AVAILABLE_THEMES.filter((t) => t.mode === "light").map((theme) => {
                  const isSelected = theme.id === currentThemeId;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme)}
                      className={`w-full px-3 py-1.5 text-xs flex items-center justify-between transition-colors text-left ${
                        isSelected
                          ? editorMode === "dark"
                            ? "bg-white/15 text-white font-semibold"
                            : "bg-slate-100 text-slate-900 font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/10 opacity-85"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Preview color dots */}
                        <div className="flex items-center gap-0.5">
                          {theme.dotColors?.map((c, i) => (
                            <span
                              key={i}
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span>{theme.name}</span>
                      </div>
                      {isSelected && <Check size={12} className="text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* AUTO FORMATTER BUTTON */}
          <button
            type="button"
            onClick={handleAutoFormat}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
              formattedJustNow
                ? "bg-emerald-500 text-white border-emerald-500 shadow-md animate-pulse"
                : editorMode === "dark"
                ? "bg-gradient-to-r from-violet-600/30 to-purple-600/30 hover:from-violet-600/40 hover:to-purple-600/40 border-purple-500/40 text-purple-200"
                : "bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-800 shadow-xs"
            }`}
            title="Auto-format Code (Shift+Alt+F / ⌥⇧F)"
          >
            {formattedJustNow ? (
              <>
                <Check size={12} className="text-white" />
                <span>Formatted!</span>
              </>
            ) : (
              <>
                <Wand2 size={12} className={editorMode === "dark" ? "text-purple-300" : "text-purple-600"} />
                <span>Format</span>
                <span className="hidden lg:inline text-[10px] opacity-65 font-mono">⌥⇧F</span>
              </>
            )}
          </button>

          {/* Stdin Toggle */}
          <button
            type="button"
            onClick={() => setShowStdin(!showStdin)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1 ${
              showStdin || stdin
                ? "bg-amber-100/90 border-amber-300 text-amber-900 font-semibold"
                : editorMode === "dark"
                ? "bg-white/10 hover:bg-white/15 border-white/10 text-slate-200"
                : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs"
            }`}
            title="Custom Input / Stdin"
          >
            <span>Stdin</span>
            {showStdin ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className={`p-1.5 rounded-lg border transition-all ${
              editorMode === "dark"
                ? "bg-white/10 hover:bg-white/15 border-white/10 text-slate-300"
                : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs"
            }`}
            title="Copy Source Code"
          >
            {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>

          {/* Reset / Clear */}
          <button
            type="button"
            onClick={handleResetCode}
            className={`p-1.5 rounded-lg border transition-all ${
              editorMode === "dark"
                ? "bg-white/10 hover:bg-white/15 border-white/10 text-slate-300 hover:text-red-400"
                : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-red-600 shadow-xs"
            }`}
            title="Reset code"
          >
            <RotateCcw size={12} />
          </button>

          {/* Run Code Button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Play size={11} className={running ? "animate-spin" : "fill-white"} />
            <span>{running ? "Executing..." : "Run Code"}</span>
          </button>
        </div>
      </div>

      {/* Optional Custom Input Drawer */}
      {showStdin && (
        <div className={`p-3 rounded-lg text-xs space-y-1.5 border transition-colors ${
          editorMode === "dark"
            ? "bg-[#181820] border-amber-500/30 text-amber-300"
            : "bg-amber-50/80 border-amber-200 text-amber-900"
        }`}>
          <div className="flex justify-between items-center font-semibold">
            <span>Standard Input (passed to Python input() lines):</span>
            {stdin && (
              <button
                type="button"
                onClick={() => setStdin("")}
                className="hover:underline text-[11px] opacity-80"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            placeholder="Type sample input for input() lines here..."
            className={`w-full p-2.5 rounded-lg font-mono text-xs border outline-none focus:ring-1 focus:ring-amber-400 ${
              editorMode === "dark"
                ? "bg-[#121217] border-white/10 text-white"
                : "bg-white border-amber-200 text-slate-900"
            }`}
          />
        </div>
      )}

      {/* =========================================================================
          Monaco Code Editor Canvas
          ========================================================================= */}
      <div className={`h-[300px] sm:h-[380px] border border-t-0 rounded-b-xl overflow-hidden shadow-sm relative transition-colors ${
        editorMode === "dark" ? "border-[#2e2e38]" : "border-[#e2e8f0]"
      }`}>
        <Editor
          height="100%"
          language={language}
          theme={currentThemeId}
          value={value}
          onChange={(val) => onChange(val || "")}
          beforeMount={(monaco) => registerMonacoThemes(monaco)}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: fontSize,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            formatOnPaste: true,
            cursorBlinking: "smooth",
            smoothScrolling: true,
            renderWhitespace: "selection",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
        />

        {/* Editor Bottom Status Bar */}
        <div className={`absolute bottom-0 left-0 right-0 px-3 py-1 flex items-center justify-between text-[11px] border-t font-mono select-none opacity-90 ${
          editorMode === "dark"
            ? "bg-[#1e1e24]/90 border-white/5 text-slate-400"
            : "bg-[#f8f9fa]/90 border-slate-200 text-slate-600"
        }`}>
          <div className="flex items-center gap-3">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>UTF-8</span>
            <span className="capitalize">{language}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size zoom */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.max(10, s - 1))}
                className="hover:text-[var(--text)] px-1 rounded"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="text-[10px]">{fontSize}px</span>
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                className="hover:text-[var(--text)] px-1 rounded"
                title="Increase font size"
              >
                A+
              </button>
            </div>
            <span>•</span>
            <span className="truncate max-w-[120px]">{currentThemeObj.name}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          Output Console Box
          ========================================================================= */}
      {output && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden text-xs shadow-inner animate-fade-in">
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#202025] text-[#a1a1aa] border-b border-[#303038]">
            <div className="flex items-center gap-2 font-mono">
              <Terminal size={13} className="text-emerald-400" />
              <span className="font-semibold text-slate-300">Execution Output</span>
              {status === "success" && (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold ml-2 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 size={11} /> Exit code 0
                </span>
              )}
              {status === "error" && (
                <span className="flex items-center gap-1 text-rose-400 font-semibold ml-2 text-[11px] bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  <AlertCircle size={11} /> Error
                </span>
              )}
              {status === "timeout" && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold ml-2 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Clock size={11} /> Timed Out
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyOutput}
                className="hover:text-white flex items-center gap-1 text-[11px] transition px-2 py-0.5 rounded hover:bg-white/10"
                title="Copy output"
              >
                {copiedOutput ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedOutput ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={() => setOutput("")}
                className="hover:text-white text-[11px] transition px-2 py-0.5 rounded hover:bg-white/10"
                title="Clear output"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="p-3.5 text-[#e4e4e7] font-mono whitespace-pre-wrap max-h-52 overflow-y-auto sa-scroll leading-relaxed select-text">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}
