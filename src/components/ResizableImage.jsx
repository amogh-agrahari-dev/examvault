import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import {
  AlignLeft, AlignCenter, AlignRight, Trash2, Maximize2, X,
  Columns, Square
} from "lucide-react";

export default function ResizableImageComponent({
  editor,
  node,
  updateAttributes,
  selected,
  deleteNode,
  getPos,
}) {
  const [isResizing, setIsResizing] = useState(false);
  const layout = node.attrs.layout || "block"; // 'block' | 'row'
  const isRowMode = layout === "row";

  // In row mode, width can NEVER be 100% because 100% forces a column line break!
  const defaultRowWidth = "48%";
  const initialWidth = isRowMode
    ? (node.attrs.width && node.attrs.width !== "100%" ? node.attrs.width : defaultRowWidth)
    : (node.attrs.width || "100%");

  const [currentWidth, setCurrentWidth] = useState(initialWidth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActiveAnchor, setIsActiveAnchor] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [flashToast, setFlashToast] = useState(null);

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Sync width from attributes
  useEffect(() => {
    if (isRowMode) {
      if (!node.attrs.width || node.attrs.width === "100%") {
        setCurrentWidth(defaultRowWidth);
      } else {
        setCurrentWidth(node.attrs.width);
      }
    } else {
      setCurrentWidth(node.attrs.width || "100%");
    }
  }, [node.attrs.width, isRowMode]);

  const effectiveWidth = isRowMode
    ? (currentWidth && currentWidth !== "100%" ? currentWidth : defaultRowWidth)
    : (currentWidth || "100%");

  // DYNAMICALLY INJECT INLINE-FLEX TO OUTER TIPTAP WRAPPER (.node-image)
  // This is the key fix that ensures images sit side-by-side in a row instead of a column!
  useLayoutEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    if (isRowMode) {
      parent.setAttribute("data-layout", "row");
      parent.setAttribute("data-image-layout", "row");
      parent.classList.add("image-row-item", "image-node-row");
      parent.classList.remove("image-block-item");
      parent.style.setProperty("display", "inline-flex", "important");
      parent.style.setProperty("vertical-align", "top", "important");
      parent.style.setProperty("width", effectiveWidth, "important");
      parent.style.setProperty("max-width", "100%", "important");
      parent.style.setProperty("margin", "6px 4px", "important");
      parent.style.setProperty("box-sizing", "border-box", "important");
    } else {
      parent.setAttribute("data-layout", "block");
      parent.setAttribute("data-image-layout", "block");
      parent.classList.remove("image-row-item", "image-node-row");
      parent.classList.add("image-block-item");
      parent.style.setProperty("display", "block", "important");
      parent.style.setProperty("vertical-align", "", "");
      parent.style.setProperty("width", "100%", "important");
      parent.style.setProperty("max-width", "100%", "important");
      parent.style.setProperty("margin", "12px 0", "");
      parent.style.setProperty("box-sizing", "border-box", "important");
    }
  }, [isRowMode, effectiveWidth]);

  const showFlashToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setFlashToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setFlashToast(null);
    }, 2500);
  }, []);

  // Handle ESC key to close enlarged modal or cancel anchor selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isModalOpen) {
          setIsModalOpen(false);
        }
        if (window.__examvault_active_image) {
          window.__examvault_active_image = null;
          window.dispatchEvent(
            new CustomEvent("examvault:image-anchor-change", { detail: null })
          );
        }
      }
      if (e.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isModalOpen]);

  // Synchronize anchor selection state across all image instances
  useEffect(() => {
    const handleAnchorChange = (e) => {
      const active = e.detail;
      const myPos = typeof getPos === "function" ? getPos() : null;
      setIsActiveAnchor(
        Boolean(active && myPos !== null && active.pos === myPos && active.src === node.attrs.src)
      );
    };

    window.addEventListener("examvault:image-anchor-change", handleAnchorChange);

    // Initial check on mount
    const currentGlobal = window.__examvault_active_image;
    const myPos = typeof getPos === "function" ? getPos() : null;
    if (currentGlobal && myPos !== null && currentGlobal.pos === myPos && currentGlobal.src === node.attrs.src) {
      setIsActiveAnchor(true);
    }

    return () => {
      window.removeEventListener("examvault:image-anchor-change", handleAnchorChange);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [getPos, node.attrs.src]);

  const alignment = node.attrs.alignment || "center";

  // Switch between Block (single full line) and Row (side-by-side stack)
  const toggleLayoutMode = (newLayout) => {
    const isNewRow = newLayout === "row";
    const finalW = isNewRow ? "48%" : "100%";
    setCurrentWidth(finalW);
    updateAttributes({
      layout: newLayout,
      width: finalW,
      alignment: isNewRow ? "left" : alignment,
    });
    showFlashToast(isNewRow ? "Row mode enabled (stacked side-by-side)" : "Block mode enabled (full width)");
  };

  // Quick width presets
  const setPresetWidth = (widthPercent, targetLayout = layout) => {
    setCurrentWidth(widthPercent);
    updateAttributes({
      width: widthPercent,
      layout: targetLayout,
    });
  };

  const setAlignment = (newAlign) => {
    updateAttributes({ alignment: newAlign });
  };

  // Stack this image with the previously clicked anchor image in a row
  const handleStackWithAnchor = (anchor, myPos) => {
    if (!editor) return;

    const doc = editor.state.doc;
    let anchorPos = anchor.pos;
    let anchorNode = doc.nodeAt(anchorPos);

    // If anchorPos shifted (due to prior edits), resolve by image src
    if (!anchorNode || anchorNode.type.name !== "image" || anchorNode.attrs.src !== anchor.src) {
      let foundPos = null;
      doc.descendants((child, pos) => {
        if (child.type.name === "image" && child.attrs.src === anchor.src) {
          foundPos = pos;
          return false;
        }
      });
      if (foundPos !== null) {
        anchorPos = foundPos;
        anchorNode = doc.nodeAt(anchorPos);
      }
    }

    // Fallback if anchor node not found: select current image
    if (!anchorNode || anchorPos === null || anchorPos === myPos) {
      const newAnchor = {
        pos: myPos,
        src: node.attrs.src,
        layout: node.attrs.layout || "block",
        width: node.attrs.width || "100%",
      };
      window.__examvault_active_image = newAnchor;
      window.dispatchEvent(
        new CustomEvent("examvault:image-anchor-change", { detail: newAnchor })
      );
      return;
    }

    const myNode = doc.nodeAt(myPos);
    if (!myNode || myNode.type.name !== "image") return;

    const firstPos = Math.min(anchorPos, myPos);
    const secondPos = Math.max(anchorPos, myPos);
    const firstNode = doc.nodeAt(firstPos);
    const secondNode = doc.nodeAt(secondPos);

    if (!firstNode || !secondNode) return;

    const areAdjacent = firstPos + firstNode.nodeSize === secondPos;
    const bothInRow = firstNode.attrs.layout === "row" && secondNode.attrs.layout === "row";

    // TOGGLE / UNSTACK if already stacked side-by-side
    if (bothInRow && areAdjacent) {
      const tr = editor.state.tr;
      tr.setNodeMarkup(firstPos, undefined, {
        ...firstNode.attrs,
        layout: "block",
        width: "100%",
        alignment: "center",
      });
      tr.setNodeMarkup(secondPos, undefined, {
        ...secondNode.attrs,
        layout: "block",
        width: "100%",
        alignment: "center",
      });
      // Separate them cleanly with a paragraph break
      tr.insert(firstPos + firstNode.nodeSize, editor.schema.nodes.paragraph.create());
      editor.view.dispatch(tr);

      showFlashToast("⇱ Unstacked images back to full width");
      window.__examvault_active_image = null;
      window.dispatchEvent(
        new CustomEvent("examvault:image-anchor-change", { detail: null })
      );
      return;
    }

    // Calculate row item count to set optimal width
    let rowCount = 2;
    // Check backwards from firstPos for existing row items
    let checkPos = firstPos;
    const backwardImages = [];
    while (checkPos > 0) {
      const $pos = doc.resolve(checkPos);
      const prevNode = $pos.nodeBefore;
      if (prevNode && prevNode.type.name === "image" && prevNode.attrs.layout === "row") {
        const pPos = checkPos - prevNode.nodeSize;
        backwardImages.push({ pos: pPos, node: prevNode });
        rowCount++;
        checkPos = pPos;
      } else {
        break;
      }
    }

    // Check forwards from secondPos for existing row items
    let forwardImages = [];
    checkPos = secondPos + secondNode.nodeSize;
    while (checkPos < doc.content.size) {
      const nextNode = doc.nodeAt(checkPos);
      if (nextNode && nextNode.type.name === "image" && nextNode.attrs.layout === "row") {
        forwardImages.push({ pos: checkPos, node: nextNode });
        rowCount++;
        checkPos += nextNode.nodeSize;
      } else {
        break;
      }
    }

    let targetWidth = "48%";
    if (rowCount === 2) targetWidth = "48%";
    else if (rowCount === 3) targetWidth = "31%";
    else if (rowCount === 4) targetWidth = "23%";
    else targetWidth = `${Math.floor(96 / rowCount)}%`;

    const tr = editor.state.tr;

    if (areAdjacent) {
      // Already adjacent, just update layout and width attributes
      tr.setNodeMarkup(firstPos, undefined, {
        ...firstNode.attrs,
        layout: "row",
        width: targetWidth,
        alignment: "left",
      });
      tr.setNodeMarkup(secondPos, undefined, {
        ...secondNode.attrs,
        layout: "row",
        width: targetWidth,
        alignment: "left",
      });
      for (const b of backwardImages) {
        tr.setNodeMarkup(b.pos, undefined, {
          ...b.node.attrs,
          layout: "row",
          width: targetWidth,
        });
      }
      for (const f of forwardImages) {
        tr.setNodeMarkup(f.pos, undefined, {
          ...f.node.attrs,
          layout: "row",
          width: targetWidth,
        });
      }
      editor.view.dispatch(tr);
    } else {
      // Not adjacent: move secondNode directly right after firstNode
      const updatedSecondNode = secondNode.type.create({
        ...secondNode.attrs,
        layout: "row",
        width: targetWidth,
        alignment: "left",
      });
      const updatedFirstNode = firstNode.type.create({
        ...firstNode.attrs,
        layout: "row",
        width: targetWidth,
        alignment: "left",
      });

      // 1. Delete secondNode at secondPos first (won't affect positions <= secondPos)
      tr.delete(secondPos, secondPos + secondNode.nodeSize);

      // 2. Remove ANY empty paragraph(s) immediately after firstNode
      const afterFirst = firstPos + firstNode.nodeSize;
      while (true) {
        const nextNode = tr.doc.nodeAt(afterFirst);
        if (nextNode && nextNode.type.name === "paragraph" && nextNode.textContent.trim() === "") {
          tr.delete(afterFirst, afterFirst + nextNode.nodeSize);
        } else {
          break;
        }
      }

      // 3. Insert secondNode right after firstNode
      tr.insert(afterFirst, updatedSecondNode);

      // 4. Update firstNode attributes
      tr.setNodeMarkup(firstPos, undefined, updatedFirstNode.attrs);

      // 5. Update backward images if any
      for (const b of backwardImages) {
        tr.setNodeMarkup(b.pos, undefined, {
          ...b.node.attrs,
          layout: "row",
          width: targetWidth,
        });
      }

      editor.view.dispatch(tr);
    }

    showFlashToast(`✨ Stacked ${rowCount} images side-by-side in a row!`);

    // Reset anchor so subsequent clicks can start a new pair
    window.__examvault_active_image = null;
    window.dispatchEvent(
      new CustomEvent("examvault:image-anchor-change", { detail: null })
    );

    // Focus editor selection on current node
    try {
      editor.commands.setNodeSelection(firstPos);
    } catch (_) {}
  };

  // Click handler on the image container
  const handleContainerClick = (e) => {
    if (isResizing) return;

    const myPos = typeof getPos === "function" ? getPos() : null;
    if (myPos === null) return;

    // SHIFT + CLICK: Stack with active anchor image
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      const activeAnchor = window.__examvault_active_image;
      if (activeAnchor) {
        handleStackWithAnchor(activeAnchor, myPos);
        return;
      }
    }

    // NORMAL CLICK: Select this image as anchor
    const newAnchor = {
      pos: myPos,
      src: node.attrs.src,
      layout: node.attrs.layout || "block",
      width: node.attrs.width || "100%",
    };
    window.__examvault_active_image = newAnchor;
    window.dispatchEvent(
      new CustomEvent("examvault:image-anchor-change", { detail: newAnchor })
    );

    if (editor) {
      try {
        editor.commands.setNodeSelection(myPos);
      } catch (_) {}
    }
  };

  // Drag-to-resize handle logic
  const handlePointerDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = imgRef.current ? imgRef.current.offsetWidth : 300;
    const parentWidth = containerRef.current?.parentElement?.offsetWidth || 700;

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = direction === "right" ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      const newPx = Math.max(120, Math.min(parentWidth, startWidth + deltaX));
      const minPercent = isRowMode ? 15 : 20;
      const maxPercent = isRowMode ? 98 : 100;
      const newPercent = `${Math.min(maxPercent, Math.max(minPercent, Math.round((newPx / parentWidth) * 100)))}%`;
      setCurrentWidth(newPercent);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      // Persist the calculated width to TipTap
      if (imgRef.current && containerRef.current?.parentElement) {
        const finalPx = imgRef.current.offsetWidth;
        const pWidth = containerRef.current.parentElement.offsetWidth || 700;
        const minPercent = isRowMode ? 15 : 20;
        const maxPercent = isRowMode ? 98 : 100;
        const finalPercent = `${Math.min(maxPercent, Math.max(minPercent, Math.round((finalPx / pWidth) * 100)))}%`;
        updateAttributes({ width: finalPercent });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const alignmentClass =
    alignment === "left"
      ? "justify-start"
      : alignment === "right"
      ? "justify-end"
      : "justify-center";

  const hasGlobalAnchor = Boolean(window.__examvault_active_image && !isActiveAnchor);

  return (
    <NodeViewWrapper
      ref={containerRef}
      data-layout={layout}
      className={`relative select-none transition-all w-full ${
        isRowMode
          ? "inline-flex align-top image-node-row"
          : `my-3 flex ${alignmentClass}`
      }`}
      style={{
        display: isRowMode ? "inline-flex" : "flex",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={handleContainerClick}
        className={`relative inline-block transition-all group cursor-pointer w-full ${
          isActiveAnchor
            ? "ring-2 ring-[#007AFF] ring-offset-2 ring-offset-[var(--surface)] rounded-lg shadow-md"
            : selected || isResizing
            ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)] rounded-lg"
            : hasGlobalAnchor && isShiftPressed
            ? "ring-2 ring-dashed ring-[#007AFF] ring-offset-1 rounded-lg"
            : ""
        }`}
        style={{
          width: isRowMode ? "100%" : effectiveWidth,
          maxWidth: "100%",
        }}
      >
        {/* Flash Toast Notification */}
        {flashToast && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-black/85 backdrop-blur-md text-white text-xs font-semibold rounded-full shadow-xl border border-white/20 animate-fade-in flex items-center gap-1.5 whitespace-nowrap pointer-events-none">
            <span>{flashToast}</span>
          </div>
        )}

        {/* Active Anchor Selection Pill */}
        {isActiveAnchor && !isModalOpen && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 px-2.5 py-0.5 bg-[#007AFF] text-white text-[11px] font-medium rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-fade-in pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Image Selected · Shift + Click another image to stack</span>
          </div>
        )}

        {/* Hover Cue when Shift key is pressed and an anchor exists */}
        {hasGlobalAnchor && isShiftPressed && (
          <div className="absolute inset-0 z-20 border-2 border-dashed border-[#007AFF] bg-[#007AFF]/15 rounded-lg flex items-center justify-center pointer-events-none animate-fade-in">
            <span className="px-2.5 py-1 bg-[#007AFF] text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
              <Columns size={13} />
              Click to stack in row
            </span>
          </div>
        )}

        {/* Floating Context Toolbar (visible when selected, anchor, or resizing) */}
        {(selected || isActiveAnchor || isResizing) && !isModalOpen && (
          <div
            className={`absolute ${isActiveAnchor ? "-top-16" : "-top-12"} left-1/2 -translate-x-1/2 z-30 sa-card px-2.5 py-1.5 shadow-lg flex items-center gap-1.5 rounded-full text-xs bg-[var(--surface)] border border-[var(--line)] animate-fade-in flex-nowrap whitespace-nowrap`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Layout Mode Switcher: Block vs Row */}
            <div className="flex items-center gap-1 pr-1.5 border-r border-[var(--line)]">
              <button
                type="button"
                onClick={() => toggleLayoutMode("block")}
                title="Single Block (occupies full line)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  !isRowMode
                    ? "bg-[var(--accent)] text-[#1A1408]"
                    : "hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <Square size={12} />
                <span>Block</span>
              </button>
              <button
                type="button"
                onClick={() => toggleLayoutMode("row")}
                title="Row Mode (stack images side-by-side in a row)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  isRowMode
                    ? "bg-[var(--accent)] text-[#1A1408]"
                    : "hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <Columns size={12} />
                <span>Row</span>
              </button>
            </div>

            {/* Presets depending on Mode */}
            {isRowMode ? (
              <div className="flex items-center gap-1 pr-1.5 border-r border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setPresetWidth("48%", "row")}
                  title="2 in a Row (48% each)"
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    effectiveWidth === "48%"
                      ? "bg-[var(--accent)] text-[#1A1408]"
                      : "hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  2 in Row
                </button>
                <button
                  type="button"
                  onClick={() => setPresetWidth("31%", "row")}
                  title="3 in a Row (31% each)"
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    effectiveWidth === "31%"
                      ? "bg-[var(--accent)] text-[#1A1408]"
                      : "hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  3 in Row
                </button>
                <button
                  type="button"
                  onClick={() => setPresetWidth("23%", "row")}
                  title="4 in a Row (23% each)"
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    effectiveWidth === "23%"
                      ? "bg-[var(--accent)] text-[#1A1408]"
                      : "hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  4 in Row
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 pr-1.5 border-r border-[var(--line)]">
                {["25%", "50%", "75%", "100%"].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPresetWidth(pct, "block")}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      effectiveWidth === pct
                        ? "bg-[var(--accent)] text-[#1A1408]"
                        : "hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {pct}
                  </button>
                ))}
              </div>
            )}

            {/* Alignment Controls (for Block mode) */}
            {!isRowMode && (
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setAlignment("left")}
                  title="Align Left"
                  className={`p-1 rounded ${
                    alignment === "left"
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setAlignment("center")}
                  title="Align Center"
                  className={`p-1 rounded ${
                    alignment === "center"
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setAlignment("right")}
                  title="Align Right"
                  className={`p-1 rounded ${
                    alignment === "right"
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <AlignRight size={14} />
                </button>
              </div>
            )}

            {/* Enlarge Modal Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              title="Enlarge Image (or Double Click)"
              className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors pr-1.5 border-r border-[var(--line)]"
            >
              <Maximize2 size={14} />
            </button>

            {/* Delete Image */}
            <button
              type="button"
              onClick={() => deleteNode()}
              title="Delete Image"
              className="p-1 rounded hover:bg-[var(--danger-soft)] text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* The Image Element */}
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || "Note Image"}
          onClick={handleContainerClick}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          title="Click to select · Shift+Click another image to stack in a row · Double-click to enlarge"
          className="w-full h-auto rounded-lg shadow-sm border border-[var(--line)] block cursor-pointer hover:opacity-95 transition-opacity"
          loading="lazy"
        />

        {/* Interactive Drag Handles on bottom-right and bottom-left (active when selected/anchor) */}
        {(selected || isActiveAnchor || isResizing) && !isModalOpen && (
          <>
            {/* Bottom-Right Handle */}
            <div
              onPointerDown={(e) => handlePointerDown(e, "right")}
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-[var(--accent)] border-2 border-[var(--surface)] rounded-full shadow-md cursor-nwse-resize hover:scale-125 transition-transform flex items-center justify-center z-20"
              title="Drag to resize"
            />
            {/* Bottom-Left Handle */}
            <div
              onPointerDown={(e) => handlePointerDown(e, "left")}
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-[var(--accent)] border-2 border-[var(--surface)] rounded-full shadow-md cursor-nesw-resize hover:scale-125 transition-transform flex items-center justify-center z-20"
              title="Drag to resize"
            />
          </>
        )}
      </div>

      {/* Enlarged Image Lightbox Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Top Controls: Close Button */}
          <div
            className="absolute top-4 right-4 z-50 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors flex items-center justify-center"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Centered Enlarged Image */}
          <div
            className="relative max-w-[92vw] max-h-[85vh] flex items-center justify-center animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={node.attrs.src}
              alt={node.attrs.alt || "Enlarged Image"}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/15 bg-black/20"
            />
          </div>

          {/* Caption footer */}
          <div
            className="mt-4 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-300 flex items-center gap-2 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{node.attrs.alt || "Diagram Preview"}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400">Click outside or press Esc to close</span>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
