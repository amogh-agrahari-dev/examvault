import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Sparkles, Move, Plus, Trash2, ArrowRight, CornerDownRight,
  GitBranch, Play, RefreshCw, Layers, Check, Palette, Eye, HelpCircle,
  Type, Square, Diamond, CircleDot, AlertCircle, Lightbulb,
  Bot, Loader2
} from "lucide-react";
import { generateAiFlowchart } from "../services/api";

// Color palettes for nodes (high contrast in both dark and light modes)
export const THEMES = {
  amber: { bg: "#FEF3C7", border: "#F59E0B", text: "#78350F" },
  blue: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E3A8A" },
  emerald: { bg: "#D1FAE5", border: "#10B981", text: "#064E3B" },
  purple: { bg: "#EDE9FE", border: "#8B5CF6", text: "#4C1D95" },
  rose: { bg: "#FFE4E6", border: "#F43F5E", text: "#881337" },
};

export function escapeXml(unsafe) {
  return (unsafe || "").replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "\"": return "&quot;";
      case "'": return "&apos;";
      default: return c;
    }
  });
}

// Curriculum topic templates for instant, high-quality diagram generation
export const CURRICULUM_TEMPLATES = {
  "binary search": {
    summary: "Binary Search Algorithm (O(log n))",
    nodes: [
      { label: "Start Search", type: "start", color: "amber" },
      { label: "Set Low=0, High=N-1", type: "process", color: "blue" },
      { label: "Mid = (Low+High) / 2", type: "process", color: "blue" },
      { label: "Target == A[Mid]?", type: "decision", color: "purple" },
      { label: "Target Found! Return Mid", type: "process", color: "emerald" },
      { label: "Target < A[Mid]?", type: "decision", color: "purple" },
      { label: "High = Mid - 1", type: "process", color: "blue" },
      { label: "Low = Mid + 1", type: "process", color: "blue" },
      { label: "Target Not Found", type: "end", color: "rose" },
    ],
    edges: [
      { from: 0, to: 1, label: "" },
      { from: 1, to: 2, label: "" },
      { from: 2, to: 3, label: "" },
      { from: 3, to: 4, label: "Yes" },
      { from: 3, to: 5, label: "No" },
      { from: 5, to: 6, label: "Yes" },
      { from: 5, to: 7, label: "No" },
      { from: 6, to: 2, label: "" },
      { from: 7, to: 2, label: "" },
    ],
  },
  "bubble sort": {
    summary: "Bubble Sort Algorithm",
    nodes: [
      { label: "Start Array Input", type: "start", color: "amber" },
      { label: "Loop i from 0 to N-1", type: "process", color: "blue" },
      { label: "Loop j from 0 to N-i-1", type: "process", color: "blue" },
      { label: "A[j] > A[j+1]?", type: "decision", color: "purple" },
      { label: "Swap A[j] and A[j+1]", type: "process", color: "emerald" },
      { label: "Sorted Array Output", type: "end", color: "rose" },
    ],
    edges: [
      { from: 0, to: 1, label: "" },
      { from: 1, to: 2, label: "" },
      { from: 2, to: 3, label: "" },
      { from: 3, to: 4, label: "Yes" },
      { from: 3, to: 2, label: "No" },
      { from: 4, to: 2, label: "" },
      { from: 2, to: 5, label: "Done" },
    ],
  },
  "merge sort": {
    summary: "Merge Sort Algorithm (Divide & Conquer)",
    nodes: [
      { label: "Start Array Input", type: "start", color: "amber" },
      { label: "Array Length <= 1?", type: "decision", color: "purple" },
      { label: "Return Array", type: "process", color: "emerald" },
      { label: "Divide at Midpoint", type: "process", color: "blue" },
      { label: "Recursively Sort Halves", type: "process", color: "blue" },
      { label: "Merge Sorted Subarrays", type: "process", color: "emerald" },
      { label: "Sorted Output", type: "end", color: "rose" },
    ],
    edges: [
      { from: 0, to: 1, label: "" },
      { from: 1, to: 2, label: "Yes" },
      { from: 1, to: 3, label: "No" },
      { from: 3, to: 4, label: "" },
      { from: 4, to: 5, label: "" },
      { from: 5, to: 6, label: "" },
    ],
  },
  "photosynthesis": {
    summary: "Photosynthesis Biological Process",
    nodes: [
      { label: "Light & Water Intake", type: "start", color: "amber" },
      { label: "Light-Dependent Reaction", type: "process", color: "blue" },
      { label: "Generate ATP & NADPH", type: "process", color: "emerald" },
      { label: "Calvin Cycle (CO2 Fixation)", type: "process", color: "purple" },
      { label: "Glucose Synthesis & Oxygen Release", type: "end", color: "rose" },
    ],
    edges: [
      { from: 0, to: 1, label: "" },
      { from: 1, to: 2, label: "" },
      { from: 2, to: 3, label: "" },
      { from: 3, to: 4, label: "" },
    ],
  },
  "water cycle": {
    summary: "Hydrological Water Cycle",
    nodes: [
      { label: "Solar Energy Input", type: "start", color: "amber" },
      { label: "Evaporation & Transpiration", type: "process", color: "blue" },
      { label: "Condensation in Clouds", type: "process", color: "purple" },
      { label: "Precipitation (Rain / Snow)", type: "process", color: "blue" },
      { label: "Collection & Groundwater", type: "end", color: "emerald" },
    ],
    edges: [
      { from: 0, to: 1, label: "" },
      { from: 1, to: 2, label: "" },
      { from: 2, to: 3, label: "" },
      { from: 3, to: 4, label: "" },
      { from: 4, to: 1, label: "Cycle Repeats" },
    ],
  },
  "login": {
    summary: "User Authentication Flow",
    nodes: [
      { label: "User Enters Email & Pass", type: "start", color: "amber" },
      { label: "Validate Credentials", type: "process", color: "blue" },
      { label: "Password Matches Hash?", type: "decision", color: "purple" },
      { label: "Generate JWT & Open Vault", type: "process", color: "emerald" },
      { label: "Show Error & Rate Limit", type: "process", color: "rose" },
    ],
    edges: [
      { from: 0, to: 1, label: "" },
      { from: 1, to: 2, label: "" },
      { from: 2, to: 3, label: "Yes" },
      { from: 2, to: 4, label: "No" },
      { from: 4, to: 0, label: "Retry" },
    ],
  },
};

// Smart Natural Language & Command Parser
export function parsePromptToFlowchart(promptText) {
  const raw = (promptText || "").trim();
  if (!raw) {
    return {
      nodes: [
        { id: "node_1", label: "Root Concept", type: "start", color: "amber" },
        { id: "node_2", label: "Child Node A", type: "process", color: "blue" },
        { id: "node_3", label: "Child Node B", type: "process", color: "blue" },
      ],
      edges: [
        { from: "node_1", to: "node_2", label: "" },
        { from: "node_1", to: "node_3", label: "" },
      ],
      summary: "Default Root with 2 Children",
    };
  }

  // 1. Normalize and clean conversational prefixes and suffixes
  let cleaned = raw
    .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:make|create|generate|draw|build|show|construct)\s+(?:me\s+)?(?:a\s+)?(?:new\s+)?flowchart\s*(?:about|for|of|where|with|:\s*)?\s*/i, "")
    .trim();
  
  // Clean trailing filler like "etc.", "please", "thanks"
  cleaned = cleaned.replace(/[\s,\.]+\betc\.?.*$/i, "").trim();
  const lowerCleaned = cleaned.toLowerCase();

  // 2. Arrow Pipeline ('A -> B -> C' or 'A => B => C' or 'A → B → C')
  for (const arrow of ["->", "=>", "→", "-->"]) {
    if (cleaned.includes(arrow)) {
      const parts = cleaned
        .split(arrow)
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        const nodes = parts.map((part, idx) => ({
          id: `node_${idx + 1}`,
          label: part,
          type: idx === 0 ? "start" : idx === parts.length - 1 ? "end" : "process",
          color: idx === 0 ? "amber" : idx === parts.length - 1 ? "rose" : "blue",
        }));
        const edges = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: "" });
        }
        return {
          nodes,
          edges,
          summary: `Sequential Pipeline (${nodes.length} steps)`,
        };
      }
    }
  }

  // 3. Decision Tree ("Condition? Yes: X, No: Y" or "If ... Then ... Else")
  if (lowerCleaned.includes("yes") && lowerCleaned.includes("no")) {
    const rootId = "node_1";
    const yesId = "node_2";
    const noId = "node_3";
    let conditionText = cleaned.replace(/[\?,].*(?:yes|no).*/i, "").trim();
    if (!conditionText || conditionText === cleaned) {
      conditionText = cleaned.split(/[\?,]/)[0].trim();
    }
    const yesMatch = cleaned.match(/yes\s*[:=\-]?\s*([^,\.]+)/i);
    const noMatch = cleaned.match(/no\s*[:=\-]?\s*([^,\.]+)/i);

    const nodes = [
      { id: rootId, label: conditionText || "Evaluate Condition?", type: "decision", color: "purple" },
      { id: yesId, label: yesMatch ? yesMatch[1].trim() : "Execute Success Action", type: "process", color: "emerald" },
      { id: noId, label: noMatch ? noMatch[1].trim() : "Handle Fallback / Error", type: "process", color: "rose" },
    ];
    const edges = [
      { from: rootId, to: yesId, label: "Yes" },
      { from: rootId, to: noId, label: "No" },
    ];
    return { nodes, edges, summary: "Decision Flowchart (Yes / No Branches)" };
  }

  // 4. Root & Children / Tree Hierarchy
  // Handles:
  // - "where abc is at root and def and fgh are the child nodes etc."
  // - "where abc is at root, def and fgh are child nodes"
  // - "abc is root and def, fgh are children"
  // - "root: abc, children: def, fgh"
  // - "root abc with children def and fgh"
  // - "abc at root with def and fgh as children"
  if (lowerCleaned.includes("root") && (lowerCleaned.includes("child") || lowerCleaned.includes("children") || lowerCleaned.includes("node") || lowerCleaned.includes("branch"))) {
    let rootLabel = null;
    let childLabels = [];

    // Split input into logical clauses by semicolons, commas, "and", or "with"
    const clauses = cleaned
      .split(/(?:[;,]|\s+and\s+|\s+with\s+)/i)
      .map((c) => c.trim())
      .filter(Boolean);

    // Identify Root from clauses
    for (const c of clauses) {
      const m1 = c.match(/(?:where\s+)?([A-Za-z0-9_\-\.]+)\s+(?:is\s+(?:at\s+)?(?:the\s+)?root|at\s+root|as\s+root)/i);
      const m2 = c.match(/\broot\s*(?:is|[:=])\s*([A-Za-z0-9_\-\.]+)/i);
      const m3 = c.match(/\broot\s+([A-Za-z0-9_\-\.]+)/i);

      if (m1) { rootLabel = m1[1].trim(); break; }
      if (m2) { rootLabel = m2[1].trim(); break; }
      if (m3) { rootLabel = m3[1].trim(); break; }
    }

    // Direct root fallback if clauses didn't isolate it cleanly
    if (!rootLabel) {
      const directRoot = cleaned.match(/(?:where\s+)?([A-Za-z0-9_\-\.]+)\s+is\s+(?:at\s+)?(?:the\s+)?root/i);
      if (directRoot) rootLabel = directRoot[1].trim();
    }

    // Identify Children from clauses
    for (const c of clauses) {
      if (/child/i.test(c)) {
        // e.g. "def and fgh are the child nodes"
        const mBefore = c.match(/([A-Za-z0-9_,\s\-\.]+?)\s+(?:are|as|be)\s+(?:the\s+)?child/i);
        if (mBefore) {
          const names = mBefore[1].split(/(?:,|\s+and\s+)/i);
          for (const n of names) {
            const cleanN = n.trim();
            if (cleanN && !/^(the|a|is|are|and|with|child|children|nodes|node|etc)$/i.test(cleanN)) {
              childLabels.push(cleanN);
            }
          }
        } else {
          // e.g. "children: def, fgh" or "children are def and fgh"
          const mAfter = c.match(/\bchild(?:ren|\s+nodes)?\s*(?:are|[:=]|include|with)?\s*([A-Za-z0-9_,\s\-\.]+)/i);
          if (mAfter) {
            const names = mAfter[1].split(/(?:,|\s+and\s+)/i);
            for (const n of names) {
              const cleanN = n.trim();
              if (cleanN && !/^(the|a|is|are|and|with|child|children|nodes|node|etc)$/i.test(cleanN)) {
                childLabels.push(cleanN);
              }
            }
          }
        }
      } else {
        // Intermediate clause between root and children (e.g. "def" in "abc is root, def, fgh are children")
        if (rootLabel && c.toLowerCase() !== rootLabel.toLowerCase() && !/root/i.test(c)) {
          const cleanN = c.replace(/^(?:where|the|a|with)\s+/i, "").trim();
          if (cleanN && !/^(the|a|is|are|and|with|child|children|nodes|node|etc)$/i.test(cleanN)) {
            childLabels.push(cleanN);
          }
        }
      }
    }

    // Direct fallback for "and def and fgh are child nodes"
    if (childLabels.length === 0) {
      const matchAfterRoot = cleaned.match(/root.*?and\s+([A-Za-z0-9_,\s\-\.]+?)\s+are\s+(?:the\s+)?child/i);
      if (matchAfterRoot) {
        const rawChildren = matchAfterRoot[1].split(/(?:,|\s+and\s+)/i);
        for (const rc of rawChildren) {
          const cl = rc.trim();
          if (cl && !/^(the|a|is|are|and|with|child|children|nodes|node|etc)$/i.test(cl)) {
            childLabels.push(cl);
          }
        }
      }
    }

    if (rootLabel) {
      const finalChildren = Array.from(new Set(childLabels)).filter(
        (c) => c.toLowerCase() !== rootLabel.toLowerCase()
      );

      if (finalChildren.length > 0) {
        const rootId = "node_root";
        const nodes = [
          { id: rootId, label: rootLabel, type: "start", color: "amber" },
        ];
        const edges = [];
        finalChildren.forEach((child, idx) => {
          const cId = `node_child_${idx + 1}`;
          nodes.push({ id: cId, label: child, type: "process", color: "blue" });
          edges.push({ from: rootId, to: cId, label: "" });
        });
        return {
          nodes,
          edges,
          summary: `Root "${rootLabel}" with ${finalChildren.length} child nodes (${finalChildren.join(", ")})`,
        };
      }
    }
  }

  // 5. Check for Curriculum Topic match with word boundaries
  for (const [topicKey, template] of Object.entries(CURRICULUM_TEMPLATES)) {
    const topicRegex = new RegExp(`\\b${topicKey.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (topicRegex.test(cleaned)) {
      const nodes = template.nodes.map((n, idx) => ({
        id: `node_${idx + 1}`,
        label: n.label,
        type: n.type,
        color: n.color,
      }));
      const edges = template.edges.map((e) => ({
        from: `node_${e.from + 1}`,
        to: `node_${e.to + 1}`,
        label: e.label || "",
      }));
      return { nodes, edges, summary: template.summary };
    }
  }

  // 6. Comma or Semicolon Separated Steps
  const steps = cleaned
    .split(/(?:[;,]|\.\s+)/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (steps.length >= 2) {
    const nodes = steps.map((st, idx) => ({
      id: `node_${idx + 1}`,
      label: st,
      type: idx === 0 ? "start" : idx === steps.length - 1 ? "end" : "process",
      color: idx === 0 ? "amber" : idx === steps.length - 1 ? "rose" : "blue",
    }));
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: "" });
    }
    return {
      nodes,
      edges,
      summary: `Process Workflow (${nodes.length} steps)`,
    };
  }

  // 7. Universal Smart Concept Fallback (Guaranteed to generate a valid flowchart)
  const conceptName = cleaned || "Study Revision Process";
  const nodes = [
    { id: "node_1", label: `Start: ${conceptName}`, type: "start", color: "amber" },
    { id: "node_2", label: "Read Inputs & Parameters", type: "process", color: "blue" },
    { id: "node_3", label: "Execute Core Logic", type: "process", color: "blue" },
    { id: "node_4", label: "Valid Outcome?", type: "decision", color: "purple" },
    { id: "node_5", label: "Display Results", type: "process", color: "emerald" },
    { id: "node_6", label: "Finish", type: "end", color: "rose" },
  ];
  const edges = [
    { from: "node_1", to: "node_2", label: "" },
    { from: "node_2", to: "node_3", label: "" },
    { from: "node_3", to: "node_4", label: "" },
    { from: "node_4", to: "node_5", label: "Yes" },
    { from: "node_4", to: "node_2", label: "No (Retry)" },
    { from: "node_5", to: "node_6", label: "" },
  ];
  return {
    nodes,
    edges,
    summary: `Structured Process for "${conceptName}"`,
  };
}

// Automatically layout nodes hierarchically
export function autoLayoutNodes(nodes, edges, width = 760, height = 480, forceRecompute = false) {
  if (!nodes || nodes.length === 0) return [];

  // Identify roots (nodes with no incoming edges)
  const incomingCount = {};
  nodes.forEach((n) => { incomingCount[n.id] = 0; });
  (edges || []).forEach((e) => {
    if (incomingCount[e.to] !== undefined) incomingCount[e.to]++;
  });

  const roots = nodes.filter((n) => incomingCount[n.id] === 0);
  const startRoots = roots.length > 0 ? roots : [nodes[0]];

  // Assign levels using BFS
  const levels = {};
  const queue = startRoots.map((r) => ({ id: r.id, level: 0 }));
  const visited = new Set();

  queue.forEach((q) => {
    levels[q.id] = 0;
    visited.add(q.id);
  });

  while (queue.length > 0) {
    const { id, level } = queue.shift();
    const children = (edges || []).filter((e) => e.from === id).map((e) => e.to);
    children.forEach((cId) => {
      if (!visited.has(cId)) {
        visited.add(cId);
        levels[cId] = level + 1;
        queue.push({ id: cId, level: level + 1 });
      }
    });
  }

  // Handle any disconnected nodes
  nodes.forEach((n) => {
    if (levels[n.id] === undefined) {
      levels[n.id] = 1;
    }
  });

  // Group by level
  const byLevel = {};
  nodes.forEach((n) => {
    const lvl = levels[n.id] || 0;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(n);
  });

  const maxLevel = Math.max(...Object.keys(byLevel).map(Number), 0);
  const levelHeight = height / (maxLevel + 2);

  const positionedNodes = nodes.map((node) => {
    const lvl = levels[node.id] || 0;
    const peers = byLevel[lvl] || [node];
    const peerIdx = peers.findIndex((p) => p.id === node.id);
    const spacing = width / (peers.length + 1);

    const computedX = Math.round(spacing * (peerIdx + 1));
    const computedY = Math.round(levelHeight * (lvl + 1));

    return {
      ...node,
      x: (!forceRecompute && node.x !== undefined) ? node.x : computedX,
      y: (!forceRecompute && node.y !== undefined) ? node.y : computedY,
      width: node.type === "decision" ? 140 : node.type === "text" ? 130 : 130,
      height: node.type === "decision" ? 64 : node.type === "text" ? 44 : 50,
    };
  });

  return positionedNodes;
}

// Generate standalone SVG data URI directly from nodes and edges
export function renderFlowchartToSvgDataUrl(nodes, edges) {
  if (!nodes || nodes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach((n) => {
    const nw = n.width || 130;
    const nh = n.height || 50;
    const left = n.x - nw / 2;
    const top = n.y - nh / 2;
    const right = n.x + nw / 2;
    const bottom = n.y + nh / 2;
    if (left < minX) minX = left;
    if (top < minY) minY = top;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  });

  const pad = 36;
  const cropX = Math.max(0, Math.floor(minX - pad));
  const cropY = Math.max(0, Math.floor(minY - pad));
  const cropW = Math.ceil(maxX - minX + pad * 2);
  const cropH = Math.ceil(maxY - minY + pad * 2);

  const edgesSvg = (edges || []).map((e, idx) => {
    const srcNode = nodes.find((n) => n.id === e.from);
    const dstNode = nodes.find((n) => n.id === e.to);
    if (!srcNode || !dstNode) return "";
    const x1 = srcNode.x;
    const y1 = srcNode.y + (srcNode.height || 50) / 2;
    const x2 = dstNode.x;
    const y2 = dstNode.y - (dstNode.height || 50) / 2;
    const midY = (y1 + y2) / 2;
    const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    const labelSvg = e.label
      ? `<text x="${(x1 + x2) / 2}" y="${midY - 4}" fill="#1F2937" font-size="11" font-weight="600" text-anchor="middle" font-family="Inter, sans-serif">${escapeXml(e.label)}</text>`
      : "";
    return `
      <g id="edge_${idx}">
        <path d="${pathD}" fill="none" stroke="#D97706" stroke-width="2.5" stroke-linecap="round" marker-end="url(#flowchart-arrow)" />
        ${labelSvg}
      </g>
    `;
  }).join("");

  const nodesSvg = nodes.map((n) => {
    const theme = THEMES[n.color || "amber"] || THEMES.amber;
    const nw = n.width || 130;
    const nh = n.height || 50;
    const label = n.label && n.label.length > 20 ? `${n.label.slice(0, 18)}…` : (n.label || "");
    
    let shapeSvg = "";
    if (n.type === "start" || n.type === "end") {
      shapeSvg = `<rect width="${nw}" height="${nh}" rx="${nh / 2}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" />`;
    } else if (n.type === "decision") {
      shapeSvg = `<polygon points="${nw / 2},0 ${nw},${nh / 2} ${nw / 2},${nh} 0,${nh / 2}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" />`;
    } else if (n.type === "text") {
      shapeSvg = `<rect width="${nw}" height="${nh}" rx="6" fill="${theme.bg}" stroke="${theme.border}" stroke-width="1.5" stroke-dasharray="4 3" />`;
    } else {
      shapeSvg = `<rect width="${nw}" height="${nh}" rx="8" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" />`;
    }

    return `
      <g transform="translate(${n.x - nw / 2}, ${n.y - nh / 2})">
        ${shapeSvg}
        <text x="${nw / 2}" y="${nh / 2 + 4}" text-anchor="middle" fill="${theme.text}" font-size="12" font-weight="600" font-family="Inter, sans-serif">
          ${escapeXml(label)}
        </text>
      </g>
    `;
  }).join("");

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cropX} ${cropY} ${cropW} ${cropH}" width="${cropW}" height="${cropH}"><rect x="${cropX}" y="${cropY}" width="${cropW}" height="${cropH}" fill="#FAFAF9" stroke="#E7E5E4" stroke-width="1.5" rx="16" /><defs><marker id="flowchart-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" /></marker></defs>${edgesSvg}${nodesSvg}</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

// Generate complete flowchart diagram directly from natural language prompt
export function generateFlowchartFromPrompt(promptText) {
  const parsed = parsePromptToFlowchart(promptText);
  const laidOut = autoLayoutNodes(parsed.nodes, parsed.edges, 760, 480, true);
  const svgDataUrl = renderFlowchartToSvgDataUrl(laidOut, parsed.edges);
  const title = (laidOut && laidOut[0]?.label) || "Flowchart Diagram";
  return { svgDataUrl, title, summary: parsed.summary, nodes: laidOut, edges: parsed.edges };
}

export default function FlowchartModal({ isOpen, onClose, onInsert, initialPrompt = "" }) {
  const [activeTab, setActiveTab] = useState("prompt"); // 'prompt' | 'nested' | 'canvas'

  // Natural Language Prompt State
  const [promptText, setPromptText] = useState(
    "Make me a flowchart where abc is at root and def and fgh are the child nodes etc."
  );
  const [promptFeedback, setPromptFeedback] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Nested Builder State
  const [nestedTree, setNestedTree] = useState({
    root: "Operating System",
    children: [
      { name: "Process Management", subChildren: ["Scheduling", "Threads", "Deadlocks"] },
      { name: "Memory Management", subChildren: ["Paging", "Virtual Memory"] },
      { name: "File System", subChildren: ["Directory Structure", "Inodes"] },
    ],
  });

  // Canvas State: Nodes & Edges
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState(null);

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);

  // Generate on modal open
  useEffect(() => {
    if (isOpen) {
      const promptToUse = initialPrompt || promptText;
      if (initialPrompt && initialPrompt !== promptText) {
        setPromptText(initialPrompt);
      }
      handleGenerateFromPrompt(promptToUse, false);
    }
  }, [isOpen, initialPrompt]);

  // Live real-time auto-generation right as user types or edits the prompt (150ms debounce)
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = (promptText || "").trim();
    if (trimmed.length < 2) return;

    const timer = setTimeout(() => {
      handleGenerateFromPrompt(trimmed, false);
    }, 150);

    return () => clearTimeout(timer);
  }, [promptText, isOpen]);

  // Convert client coordinates to SVG viewBox coordinate space
  const getSvgCoordinates = (clientX, clientY) => {
    if (!svgRef.current) return { x: clientX, y: clientY };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 780,
      y: ((clientY - rect.top) / rect.height) * 490,
    };
  };

  const handleGenerateFromPrompt = (textToParse = promptText, switchTab = true) => {
    const text = (textToParse || promptText || "").trim();
    const parsed = parsePromptToFlowchart(text);
    if (parsed && parsed.nodes) {
      const laidOut = autoLayoutNodes(parsed.nodes, parsed.edges, 760, 480, true);
      setNodes(laidOut);
      setEdges(parsed.edges);
      setSelectedNodeId(null);
      setPromptFeedback(parsed.summary || `Flowchart generated with ${laidOut.length} nodes`);
      if (switchTab) {
        setActiveTab("canvas");
      }
      return { nodes: laidOut, edges: parsed.edges, summary: parsed.summary };
    }
    return null;
  };

  // Instant one-click generate and insert directly into active note
  const handleGenerateAndInsert = (textToParse = promptText) => {
    const res = handleGenerateFromPrompt(textToParse, false);
    if (res && res.nodes && res.nodes.length > 0) {
      handleInsertIntoNote(res.nodes, res.edges);
    } else if (nodes.length > 0) {
      handleInsertIntoNote(nodes, edges);
    }
  };

  // Generate intelligent flowchart via Ollama LLM
  const handleGenerateWithOllama = async (textToParse = promptText, andInsert = false) => {
    const text = (textToParse || promptText || "").trim();
    if (!text) return;
    setIsGeneratingAi(true);
    setPromptFeedback("🤖 Asking Ollama AI to synthesize conceptual flowchart...");

    try {
      const token = localStorage.getItem("access_token");
      const res = await generateAiFlowchart(text, token);
      if (res && res.nodes && res.nodes.length > 0) {
        const laidOut = autoLayoutNodes(res.nodes, res.edges || [], 760, 480, true);
        setNodes(laidOut);
        setEdges(res.edges || []);
        setSelectedNodeId(null);
        setPromptFeedback(`✓ Ollama (${res.model || "gemma2:9b"}) generated ${laidOut.length} nodes: "${res.title || text}"`);
        if (andInsert) {
          handleInsertIntoNote(laidOut, res.edges || []);
        }
      } else {
        throw new Error("No nodes returned by Ollama");
      }
    } catch (err) {
      console.warn("Ollama AI generation failed, falling back to instant algorithm:", err);
      const fallback = handleGenerateFromPrompt(text, false);
      setPromptFeedback(`⚡ Generated locally via algorithm (Ollama offline/busy)`);
      if (andInsert && fallback && fallback.nodes) {
        handleInsertIntoNote(fallback.nodes, fallback.edges);
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleGenerateFromNested = () => {
    const newNodes = [];
    const newEdges = [];

    const rootId = "root_0";
    newNodes.push({ id: rootId, label: nestedTree.root || "Root", type: "start", color: "amber" });

    nestedTree.children.forEach((child, cIdx) => {
      const cId = `child_${cIdx}`;
      newNodes.push({ id: cId, label: child.name || `Child ${cIdx + 1}`, type: "process", color: "blue" });
      newEdges.push({ from: rootId, to: cId, label: "" });

      child.subChildren.forEach((sub, sIdx) => {
        const subId = `sub_${cIdx}_${sIdx}`;
        newNodes.push({ id: subId, label: sub, type: "process", color: "emerald" });
        newEdges.push({ from: cId, to: subId, label: "" });
      });
    });

    const laidOut = autoLayoutNodes(newNodes, newEdges, 760, 480, true);
    setNodes(laidOut);
    setEdges(newEdges);
    setSelectedNodeId(null);
    setPromptFeedback(`Created hierarchy from nested tree (${laidOut.length} nodes)`);
    setActiveTab("canvas");
  };

  // Drag existing node on SVG
  const handleNodePointerDown = (e, nodeId) => {
    e.stopPropagation();
    if (isConnecting) {
      handleConnectClick(nodeId);
      return;
    }

    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const coords = getSvgCoordinates(e.clientX, e.clientY);
      setDragOffset({
        x: coords.x - node.x,
        y: coords.y - node.y,
      });
    }
  };

  const handleSvgPointerMove = useCallback((e) => {
    if (!draggingNodeId) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            x: Math.max(65, Math.min(715, coords.x - dragOffset.x)),
            y: Math.max(30, Math.min(460, coords.y - dragOffset.y)),
          };
        }
        return n;
      })
    );
  }, [draggingNodeId, dragOffset]);

  const handleSvgPointerUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  useEffect(() => {
    if (draggingNodeId) {
      window.addEventListener("pointermove", handleSvgPointerMove);
      window.addEventListener("pointerup", handleSvgPointerUp);
      return () => {
        window.removeEventListener("pointermove", handleSvgPointerMove);
        window.removeEventListener("pointerup", handleSvgPointerUp);
      };
    }
  }, [draggingNodeId, handleSvgPointerMove, handleSvgPointerUp]);

  // HTML5 Drag and Drop from toolbar onto SVG
  const handleShapeDragStart = (e, shapeType) => {
    e.dataTransfer.setData("application/flowchart-shape", shapeType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const shapeType = e.dataTransfer.getData("application/flowchart-shape");
    if (!shapeType) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    handleAddNode(shapeType, coords.x, coords.y);
  };

  // Connect Nodes Tool
  const handleConnectClick = (nodeId) => {
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
    } else {
      if (connectSourceId !== nodeId) {
        const exists = edges.some((e) => e.from === connectSourceId && e.to === nodeId);
        if (!exists) {
          setEdges((prev) => [...prev, { from: connectSourceId, to: nodeId, label: "" }]);
        }
      }
      setConnectSourceId(null);
      setIsConnecting(false);
    }
  };

  // Add a new node manually (via click or drop)
  const handleAddNode = (type = "process", customX, customY) => {
    const id = `node_${Date.now()}`;
    const newNode = {
      id,
      label:
        type === "decision"
          ? "Condition?"
          : type === "start"
          ? "Start / Root"
          : type === "text"
          ? "Notes Box"
          : "Process Step",
      type,
      color: type === "decision" ? "purple" : type === "start" ? "amber" : type === "text" ? "rose" : "blue",
      x: customX !== undefined ? Math.max(65, Math.min(715, customX)) : 380,
      y: customY !== undefined ? Math.max(30, Math.min(460, customY)) : 240,
      width: type === "decision" ? 140 : type === "text" ? 130 : 130,
      height: type === "decision" ? 64 : type === "text" ? 44 : 50,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
    setActiveTab("canvas");
  };

  // Delete selected node
  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.from !== selectedNodeId && e.to !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Export SVG as Clean, Standalone Data URI and Insert
  const handleInsertIntoNote = (customNodes = null, customEdges = null) => {
    const activeNodes = (customNodes && customNodes.length > 0) ? customNodes : nodes;
    const activeEdges = customEdges !== null ? customEdges : edges;
    if (!activeNodes || activeNodes.length === 0) return;

    const encodedSvg = renderFlowchartToSvgDataUrl(activeNodes, activeEdges);
    if (!encodedSvg) return;
    const title = activeNodes[0]?.label || "Flowchart Diagram";
    onInsert(encodedSvg, title);
    onClose();
  };

  if (!isOpen) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="sa-card max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
        {/* =========================================================================
            Modal Header & Mode Switcher
            ========================================================================= */}
        <div className="p-4 md:px-6 md:py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-4 bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <GitBranch size={20} />
            </div>
            <div>
              <h2 className="sa-serif text-lg font-bold text-[var(--text)]">Flowchart & Diagram Studio</h2>
              <p className="text-xs text-[var(--muted)] hidden sm:block">
                Build revision flowcharts with drag-and-drop shapes, text boxes, or natural language prompts.
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--line)] rounded-xl">
            <button
              onClick={() => setActiveTab("prompt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "prompt"
                  ? "bg-[var(--accent)] text-[#1A1408] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Sparkles size={13} />
              <span>Prompt Command</span>
            </button>
            <button
              onClick={() => setActiveTab("nested")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "nested"
                  ? "bg-[var(--accent)] text-[#1A1408] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Layers size={13} />
              <span>Nested Builder</span>
            </button>
            <button
              onClick={() => setActiveTab("canvas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "canvas"
                  ? "bg-[var(--accent)] text-[#1A1408] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Move size={13} />
              <span>Canvas ({nodes.length} Nodes)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* =========================================================================
            Tab 1: Natural Language Prompt Mode (Option 2)
            ========================================================================= */}
        {activeTab === "prompt" && (
          <div className="p-3 md:px-6 md:py-3.5 border-b border-[var(--line)] bg-[var(--surface)] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>Flowchart Prompt (generates right as you type or paste):</span>
              </label>
              {promptFeedback && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <Check size={13} />
                  <span>{promptFeedback}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text) {
                      setPromptText(text);
                      handleGenerateFromPrompt(text, false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGenerateAndInsert(promptText);
                    }
                  }}
                  placeholder="Type e.g. 'root Animal, children Mammal, Reptile, Bird' or 'A -> B -> C' or 'Binary Search'..."
                  className="sa-auth-input w-full text-xs md:text-sm h-10 px-3 pr-8 rounded-xl border border-[var(--line)]"
                  autoFocus
                />
                {promptText && (
                  <button
                    onClick={() => {
                      setPromptText("");
                      setPromptFeedback(null);
                    }}
                    title="Clear prompt"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                onClick={() => handleGenerateAndInsert(promptText)}
                disabled={(!promptText.trim() && nodes.length === 0) || isGeneratingAi}
                className="sa-btn-primary px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md active:scale-98 disabled:opacity-50"
                title="Generate flowchart and insert directly into your note (Enter)"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span>Instant Insert (Enter)</span>
              </button>

              <button
                onClick={() => handleGenerateWithOllama(promptText, false)}
                disabled={!promptText.trim() || isGeneratingAi}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs bg-purple-600/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-600/25 active:scale-98 disabled:opacity-50 transition-all"
                title="Use local Ollama LLM to synthesize a conceptual flowchart"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-purple-500" />
                    <span>Ollama Thinking...</span>
                  </>
                ) : (
                  <>
                    <Bot size={13} className="text-purple-500" />
                    <span>Ask Ollama AI</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleGenerateFromPrompt(promptText, false)}
                disabled={isGeneratingAi}
                className="sa-btn-outline px-2.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs text-[var(--muted)] hover:text-[var(--text)]"
                title="Update preview on canvas below"
              >
                <RefreshCw size={12} />
                <span>Preview</span>
              </button>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-[var(--muted)] font-medium flex items-center gap-1">
                <Lightbulb size={12} className="text-amber-500" /> Quick Examples:
              </span>
              {[
                "Make me a flowchart where abc is at root and def and fgh are the child nodes etc.",
                "Start -> Fetch Data -> Check Cache -> Render UI -> Finish",
                "Binary Search algorithm",
                "User login authentication flow",
                "Is user authenticated? Yes: Show Notes, No: Show Login",
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPromptText(sample);
                    handleGenerateFromPrompt(sample, false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-[var(--surface-subtle)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--text)] transition-colors text-left truncate max-w-xs"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            Tab 2: Nested Tree / Select Builder Mode (Option 2 Alternate)
            ========================================================================= */}
        {activeTab === "nested" && (
          <div className="p-4 md:p-6 border-b border-[var(--line)] bg-[var(--surface)] max-h-56 overflow-y-auto sa-scroll space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text)] w-20">Root Node:</span>
                <input
                  type="text"
                  value={nestedTree.root}
                  onChange={(e) => setNestedTree({ ...nestedTree, root: e.target.value })}
                  placeholder="Root Node Name..."
                  className="sa-auth-input h-8 px-3 text-xs w-72 rounded-lg"
                />
              </div>

              {nestedTree.children.map((child, cIdx) => (
                <div key={cIdx} className="pl-6 border-l-2 border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <CornerDownRight size={14} className="text-amber-500" />
                    <input
                      type="text"
                      value={child.name}
                      onChange={(e) => {
                        const updated = [...nestedTree.children];
                        updated[cIdx].name = e.target.value;
                        setNestedTree({ ...nestedTree, children: updated });
                      }}
                      placeholder={`Child ${cIdx + 1} Name`}
                      className="sa-auth-input h-8 px-2.5 text-xs w-56 rounded-lg font-medium"
                    />
                    <button
                      onClick={() => {
                        const updated = [...nestedTree.children];
                        updated[cIdx].subChildren.push(`Sub ${updated[cIdx].subChildren.length + 1}`);
                        setNestedTree({ ...nestedTree, children: updated });
                      }}
                      className="text-xs text-[var(--accent)] hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={12} /> Add Sub-node
                    </button>
                    <button
                      onClick={() => {
                        const updated = nestedTree.children.filter((_, idx) => idx !== cIdx);
                        setNestedTree({ ...nestedTree, children: updated });
                      }}
                      className="text-xs text-[var(--muted)] hover:text-[var(--danger)] ml-auto"
                    >
                      Delete Branch
                    </button>
                  </div>

                  {/* Sub-children list */}
                  {child.subChildren.length > 0 && (
                    <div className="pl-6 flex items-center gap-2 flex-wrap">
                      {child.subChildren.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center gap-1 bg-[var(--surface-subtle)] border border-[var(--line)] px-2 py-0.5 rounded-md text-xs"
                        >
                          <input
                            type="text"
                            value={sub}
                            onChange={(e) => {
                              const updated = [...nestedTree.children];
                              updated[cIdx].subChildren[sIdx] = e.target.value;
                              setNestedTree({ ...nestedTree, children: updated });
                            }}
                            className="bg-transparent text-xs outline-none text-[var(--text)] w-24"
                          />
                          <button
                            onClick={() => {
                              const updated = [...nestedTree.children];
                              updated[cIdx].subChildren = updated[cIdx].subChildren.filter((_, idx) => idx !== sIdx);
                              setNestedTree({ ...nestedTree, children: updated });
                            }}
                            className="text-[var(--muted)] hover:text-[var(--danger)]"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setNestedTree({
                      ...nestedTree,
                      children: [...nestedTree.children, { name: `Branch ${nestedTree.children.length + 1}`, subChildren: [] }],
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-subtle)] text-[var(--text)] hover:bg-[var(--surface-hover)] border border-[var(--line)]"
                >
                  + Add Child Branch
                </button>
                <button
                  onClick={handleGenerateFromNested}
                  className="sa-btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold ml-auto"
                >
                  Apply & Layout on Canvas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            Visual Canvas Toolbar (Shape palette, drag & drop, connect, styling)
            ========================================================================= */}
        <div className="p-2 md:px-4 border-b border-[var(--line)] flex items-center justify-between gap-2 flex-wrap bg-[var(--surface)] text-xs">
          {/* Add & Drag Shapes Palette (Option 1) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)] font-medium pr-1 hidden sm:inline">Add / Drag:</span>
            
            {/* Process Box */}
            <button
              draggable
              onDragStart={(e) => handleShapeDragStart(e, "process")}
              onClick={() => handleAddNode("process")}
              title="Click to add or drag onto canvas"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--text)] flex items-center gap-1.5 font-medium cursor-grab active:cursor-grabbing"
            >
              <Square size={13} className="text-blue-500" />
              <span>Process</span>
            </button>

            {/* Decision Diamond */}
            <button
              draggable
              onDragStart={(e) => handleShapeDragStart(e, "decision")}
              onClick={() => handleAddNode("decision")}
              title="Click to add or drag onto canvas"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--text)] flex items-center gap-1.5 font-medium cursor-grab active:cursor-grabbing"
            >
              <Diamond size={13} className="text-purple-500" />
              <span>Decision</span>
            </button>

            {/* Start / End Pill */}
            <button
              draggable
              onDragStart={(e) => handleShapeDragStart(e, "start")}
              onClick={() => handleAddNode("start")}
              title="Click to add or drag onto canvas"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--text)] flex items-center gap-1.5 font-medium cursor-grab active:cursor-grabbing"
            >
              <CircleDot size={13} className="text-amber-500" />
              <span>Start/End</span>
            </button>

            {/* Text Box */}
            <button
              draggable
              onDragStart={(e) => handleShapeDragStart(e, "text")}
              onClick={() => handleAddNode("text")}
              title="Click to add or drag onto canvas"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--text)] flex items-center gap-1.5 font-medium cursor-grab active:cursor-grabbing"
            >
              <Type size={13} className="text-rose-500" />
              <span>Text Box</span>
            </button>
          </div>

          {/* Connect & Arrange Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => {
                setIsConnecting(!isConnecting);
                setConnectSourceId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                isConnecting
                  ? "bg-amber-500 text-slate-950 ring-2 ring-amber-400"
                  : "bg-[var(--surface-subtle)] border border-[var(--line)] text-[var(--text)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <ArrowRight size={13} />
              <span>{isConnecting ? (connectSourceId ? "Click target node..." : "Click source node...") : "Connect Arrow"}</span>
            </button>

            <button
              onClick={() => {
                const laidOut = autoLayoutNodes(nodes, edges, 760, 480, true);
                setNodes(laidOut);
              }}
              title="Auto-arrange nodes hierarchically"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] hover:bg-[var(--surface-hover)] text-[var(--text)] flex items-center gap-1"
            >
              <RefreshCw size={13} /> Auto-Arrange
            </button>

            {selectedNode && (
              <button
                onClick={handleDeleteSelected}
                title="Delete Selected Node"
                className="p-1.5 rounded-lg text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Selected Node Inline Label & Color Editor */}
        {selectedNode && (
          <div className="px-4 py-2 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex items-center gap-3 text-xs animate-fade-in flex-wrap">
            <span className="font-semibold text-[var(--text)]">Edit Selected:</span>
            <input
              type="text"
              value={selectedNode.label}
              onChange={(e) => {
                const val = e.target.value;
                setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, label: val } : n)));
              }}
              placeholder="Node text..."
              className="h-7 px-2.5 rounded-md text-xs bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] outline-none min-w-[160px]"
            />
            {/* Color switcher */}
            <div className="flex items-center gap-1.5">
              {Object.keys(THEMES).map((cKey) => (
                <button
                  key={cKey}
                  onClick={() => {
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, color: cKey } : n)));
                  }}
                  className="w-4 h-4 rounded-full border border-gray-400 hover:scale-125 transition-transform"
                  style={{ backgroundColor: THEMES[cKey].border }}
                />
              ))}
            </div>
            <span className="text-[11px] text-[var(--muted)] ml-auto">
              Drag node anywhere or double-click to rename
            </span>
          </div>
        )}

        {/* =========================================================================
            Main Interactive SVG Flowchart Canvas
            ========================================================================= */}
        <div
          className="flex-1 bg-[var(--surface-subtle)] relative overflow-hidden flex items-center justify-center p-3 select-none"
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 780 490"
            className="w-full h-full max-h-[490px] rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-inner"
            style={{ cursor: isConnecting ? "crosshair" : "default" }}
          >
            <defs>
              {/* Arrowhead marker */}
              <marker
                id="flowchart-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
              </marker>

              {/* Grid pattern background */}
              <pattern id="flowchart-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#94A3B8" opacity="0.15" />
              </pattern>
            </defs>

            {/* Grid background */}
            <rect width="100%" height="100%" fill="url(#flowchart-grid)" />

            {/* Render Connecting Edges (Arrows) */}
            {edges.map((edge, idx) => {
              const srcNode = nodes.find((n) => n.id === edge.from);
              const dstNode = nodes.find((n) => n.id === edge.to);
              if (!srcNode || !dstNode) return null;

              const x1 = srcNode.x;
              const y1 = srcNode.y + (srcNode.height || 50) / 2;
              const x2 = dstNode.x;
              const y2 = dstNode.y - (dstNode.height || 50) / 2;

              // Smooth curved bezier line
              const midY = (y1 + y2) / 2;
              const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

              return (
                <g key={idx} className="group">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    markerEnd="url(#flowchart-arrow)"
                    className="transition-all"
                  />
                  {edge.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={midY - 4}
                      fill="#1F2937"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnectTarget = isConnecting && connectSourceId === node.id;
              const theme = THEMES[node.color || "amber"] || THEMES.amber;

              const nw = node.width || 130;
              const nh = node.height || 50;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x - nw / 2}, ${node.y - nh / 2})`}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newText = window.prompt("Edit node label:", node.label);
                    if (newText !== null && newText.trim()) {
                      setNodes((prev) =>
                        prev.map((n) => (n.id === node.id ? { ...n, label: newText.trim() } : n))
                      );
                    }
                  }}
                  className="cursor-move group"
                >
                  {/* Selection Glow */}
                  {(isSelected || isConnectTarget) && (
                    <rect
                      x="-4"
                      y="-4"
                      width={nw + 8}
                      height={nh + 8}
                      rx="12"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="selection-glow"
                    />
                  )}

                  {/* Node Shapes */}
                  {node.type === "start" || node.type === "end" ? (
                    <rect
                      width={nw}
                      height={nh}
                      rx={nh / 2}
                      fill={theme.bg}
                      stroke={theme.border}
                      strokeWidth="2"
                      className="transition-colors"
                    />
                  ) : node.type === "decision" ? (
                    <polygon
                      points={`${nw / 2},0 ${nw},${nh / 2} ${nw / 2},${nh} 0,${nh / 2}`}
                      fill={theme.bg}
                      stroke={theme.border}
                      strokeWidth="2"
                      className="transition-colors"
                    />
                  ) : node.type === "text" ? (
                    <rect
                      width={nw}
                      height={nh}
                      rx="6"
                      fill={theme.bg}
                      stroke={theme.border}
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      className="transition-colors"
                    />
                  ) : (
                    <rect
                      width={nw}
                      height={nh}
                      rx="8"
                      fill={theme.bg}
                      stroke={theme.border}
                      strokeWidth="2"
                      className="transition-colors"
                    />
                  )}

                  {/* Node Label Text */}
                  <text
                    x={nw / 2}
                    y={nh / 2 + 4}
                    textAnchor="middle"
                    fill={theme.text}
                    fontSize="12"
                    fontWeight="600"
                    fontFamily="Inter, sans-serif"
                    className="select-none pointer-events-none"
                  >
                    {node.label.length > 20 ? `${node.label.slice(0, 18)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* =========================================================================
            Modal Footer: Insert & Cancel Actions
            ========================================================================= */}
        <div className="p-3 md:px-6 md:py-3.5 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
            <HelpCircle size={14} />
            <span className="hidden sm:inline">Flowchart inserts as an inline diagram that can be resized or enlarged.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="sa-btn-outline px-4 py-2 text-xs md:text-sm rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleInsertIntoNote}
              disabled={nodes.length === 0}
              className="sa-btn-primary px-5 py-2 text-xs md:text-sm rounded-xl font-semibold flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98 transition-all disabled:opacity-50"
            >
              <Check size={16} />
              <span>Insert Flowchart into Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
