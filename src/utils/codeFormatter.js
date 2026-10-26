/**
 * Intelligent Code Formatter for Multiple Languages (Python, JS, C++, Java, etc.)
 * Provides auto-formatting and AST/heuristic indentation normalization.
 */

/**
 * Format Python source code according to PEP 8 standards
 */
export function formatPython(code) {
  if (!code || typeof code !== "string") return "";

  const lines = code.split("\n");
  const formattedLines = [];
  let currentIndent = 0;
  const indentSize = 4;

  const dedentKeywords = /^\s*(elif\b|else\s*:|except\b|finally\s*:)/;
  const blockStarters = /:\s*(#.*)?$/;

  // Track parenthetical open count (for multi-line tuples, lists, args)
  let openParenCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Preserve blank lines, but max 2 consecutive
    if (!trimmed) {
      if (
        formattedLines.length === 0 ||
        formattedLines[formattedLines.length - 1] === ""
      ) {
        // Skip duplicate blank line
        continue;
      }
      formattedLines.push("");
      continue;
    }

    // Comments at start of line
    if (trimmed.startsWith("#")) {
      formattedLines.push(" ".repeat(currentIndent * indentSize) + trimmed);
      continue;
    }

    // Dedent for elif, else, except, finally
    let effectiveIndent = currentIndent;
    if (dedentKeywords.test(trimmed)) {
      effectiveIndent = Math.max(0, currentIndent - 1);
    }

    // Clean operators and commas while preserving strings
    let cleanLine = formatPythonLineTokens(trimmed);

    // Apply indentation
    formattedLines.push(" ".repeat(effectiveIndent * indentSize) + cleanLine);

    // Calculate indent changes for next lines
    if (blockStarters.test(trimmed)) {
      currentIndent = effectiveIndent + 1;
    } else if (
      trimmed.startsWith("return") ||
      trimmed === "pass" ||
      trimmed === "break" ||
      trimmed === "continue"
    ) {
      // Check if next line is not indented more
      // Keep indent unless end of file or dedent is needed
    }

    // Count parenthesis
    for (const char of cleanLine) {
      if (char === "(" || char === "[" || char === "{") openParenCount++;
      if (char === ")" || char === "]" || char === "}") {
        openParenCount = Math.max(0, openParenCount - 1);
      }
    }
  }

  // Ensure single trailing newline
  let result = formattedLines.join("\n").trimEnd() + "\n";
  return result;
}

/**
 * Format tokens in a single Python line (operators, commas, spaces)
 */
function formatPythonLineTokens(line) {
  // If line contains string literals or comments, format cautiously
  if (line.includes('"') || line.includes("'") || line.includes("#")) {
    // Preserve string literals and comments while spacing commas
    return line
      .replace(/,\s*/g, ", ")
      .replace(/:\s*([^#\s])/g, ": $1")
      .trim();
  }

  return line
    // Commas
    .replace(/\s*,\s*/g, ", ")
    // Colons in dict or slices (not at end of line)
    .replace(/(\w)\s*:\s*(\w)/g, "$1: $2")
    // Comparison operators
    .replace(/\s*(===?|!==?|<=|>=|<|>)\s*/g, " $1 ")
    // Arithmetic & Assignment operators
    .replace(/\s*(\+=|-=|\*=|\/=|%=|\/\/=|\*\*=)\s*/g, " $1 ")
    .replace(/(?<=[a-zA-Z0-9_)])\s*([=])\s*(?=[a-zA-Z0-9_("'])/g, " = ")
    .replace(/(?<=[a-zA-Z0-9_)])\s*(\+|\-|\*|\/|%)\s*(?=[a-zA-Z0-9_("'])/g, " $1 ")
    // Multiple spaces
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Format C-style languages (JavaScript, TypeScript, C++, C, Java)
 */
export function formatCStyle(code) {
  if (!code || typeof code !== "string") return "";

  const lines = code.split("\n");
  const formattedLines = [];
  let currentIndent = 0;
  const indentSize = 4;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== "") {
        formattedLines.push("");
      }
      continue;
    }

    // Decrement indent if line starts with closing brace
    let effectiveIndent = currentIndent;
    if (trimmed.startsWith("}") || trimmed.startsWith(")") || trimmed.startsWith("]")) {
      effectiveIndent = Math.max(0, currentIndent - 1);
    }

    // Clean line spacing
    let cleanLine = trimmed
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s*;\s*$/g, ";")
      .replace(/\s*{\s*$/g, " {");

    // Add proper spacing around binary operators if no string
    if (!cleanLine.includes('"') && !cleanLine.includes("'") && !cleanLine.includes("`")) {
      cleanLine = cleanLine
        .replace(/\s*(===?|!==?|<=|>=|<|>|\+=|-=|\*=|\/=)\s*/g, " $1 ")
        .replace(/(?<=[a-zA-Z0-9_])\s*=\s*(?=[a-zA-Z0-9_])/g, " = ");
    }

    formattedLines.push(" ".repeat(effectiveIndent * indentSize) + cleanLine);

    // Calculate indent changes for following lines
    let openBraces = (cleanLine.match(/{/g) || []).length;
    let closeBraces = (cleanLine.match(/}/g) || []).length;
    currentIndent = Math.max(0, effectiveIndent + openBraces - closeBraces);
  }

  return formattedLines.join("\n").trimEnd() + "\n";
}

/**
 * Unified smart formatter for any supported programming language
 */
export function smartFormatCode(code, language = "python") {
  if (!code || typeof code !== "string") return "";

  const lang = (language || "").toLowerCase();

  try {
    if (lang === "python" || lang === "py") {
      return formatPython(code);
    }

    if (
      lang === "javascript" ||
      lang === "js" ||
      lang === "typescript" ||
      lang === "ts" ||
      lang === "cpp" ||
      lang === "c" ||
      lang === "java" ||
      lang === "csharp" ||
      lang === "cs"
    ) {
      return formatCStyle(code);
    }

    // Default clean-up
    return code
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .trimEnd() + "\n";
  } catch (err) {
    console.warn("Formatting failed, returning original code:", err);
    return code;
  }
}

/**
 * Executes formatting inside a Monaco editor instance
 * Tries native Monaco formatDocument action first, then falls back to smartFormatCode.
 */
export async function formatMonacoDocument(editor, monaco, language = "python") {
  if (!editor) return false;

  try {
    const originalText = editor.getValue();
    const action = editor.getAction("editor.action.formatDocument");

    if (action) {
      await action.run();
      const afterNative = editor.getValue();
      if (afterNative !== originalText) {
        return true;
      }
    }

    // If native formatter didn't alter or is not loaded for this language
    const formatted = smartFormatCode(originalText, language);
    if (formatted && formatted !== originalText) {
      const model = editor.getModel();
      if (model) {
        editor.executeEdits("auto-formatter", [
          {
            range: model.getFullModelRange(),
            text: formatted,
            forceMoveMarkers: true,
          },
        ]);
        editor.pushUndoStop();
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error("Monaco format error:", err);
    return false;
  }
}
