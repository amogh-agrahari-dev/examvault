import React from "react";
import { common, createLowlight } from "lowlight";

export const lowlight = createLowlight(common);

/**
 * Highlights a snippet or line of code into colored React elements using Lowlight / HLJS tokens
 */
export function highlightCodeToReact(code, language = "python") {
  if (!code) return null;
  try {
    const lang = (language || "python").toLowerCase();
    const targetLang = lowlight.registered(lang) ? lang : "python";
    const tree = lowlight.highlight(targetLang, code);

    function renderNode(node, key) {
      if (node.type === "text") return node.value;
      if (node.type === "element") {
        const className = (node.properties?.className || []).join(" ");
        const children = node.children?.map((child, idx) => renderNode(child, idx));
        return React.createElement("span", { key, className }, children);
      }
      return null;
    }

    return tree.children.map((n, i) => renderNode(n, i));
  } catch (err) {
    return code;
  }
}
