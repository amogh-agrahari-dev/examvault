import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import ResizableImageComponent from "./ResizableImage";
import InteractiveCodeBlock from "./InteractiveCodeBlock";
import CodingWorkspace from "./CodingWorkspace";

const lowlight = createLowlight(common);
import CodeSimulationModal, { PRESET_ALGORITHMS } from "./CodeSimulationModal";
import FlowchartModal, {
  generateFlowchartFromPrompt,
  autoLayoutNodes,
  renderFlowchartToSvgDataUrl,
} from "./FlowchartModal";

import {
  ArrowLeft, Check, AlertCircle, Loader2, Bold, Italic,
  Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, AlignLeft, AlignCenter, AlignRight,
  Image as ImageIcon, Undo2, Redo2, RemoveFormatting,
  Palette, Highlighter, UploadCloud, Link as LinkIcon, RefreshCw, GitBranch,
  Sparkles, X, Bot, Download, Printer, Columns, ChevronDown,
  FileText, Maximize2, Minimize2, Code2, Play, Cpu,
  Type, Quote, Minus, BookOpen, Clock, Keyboard, Layout, Eye, CheckCircle2,
  Folder, FolderPlus, FolderTree, FolderOpen, ChevronRight, Plus, Search
} from "lucide-react";

import {
  getNote, updateNote, uploadNoteImage, getNoteImageUrl,
  getAvailableNoteTopics, request, generateAiFlowchart, simulateCode,
  createSubject, createNoteTopic, API_BASE_URL
} from "../services/api";
import { exportNoteToPdf, printNoteDocument } from "../services/pdfExport";

// Document Page Layouts
export const PAGE_TYPES = [
  {
    id: "fill",
    label: "Fill to Page",
    badge: "Fluid",
    description: "Expansive edge-to-edge canvas with balanced gutters for code, diagrams & media",
    icon: Maximize2,
    containerClass: "w-full max-w-[1260px] mx-auto px-2 sm:px-6 lg:px-10 py-4 sm:py-8 min-h-[calc(100vh-210px)]",
    cardClass: "bg-[var(--surface)] border border-[var(--line)] shadow-xs rounded-2xl p-6 sm:p-12 lg:p-16 transition-all",
  },
  {
    id: "document",
    label: "Standard Document (A4)",
    badge: "A4 Page",
    description: "Classic paper sheet with traditional elevation, margins & printed page layout",
    icon: FileText,
    containerClass: "max-w-4xl mx-auto my-2 sm:my-6 px-2 sm:px-4",
    cardClass: "bg-[var(--surface)] border border-[var(--line)] note-page-sheet-shadow rounded-xl p-8 sm:p-16 min-h-[960px] transition-all",
  },
  {
    id: "focus",
    label: "Focus Reading",
    badge: "Compact",
    description: "Distraction-free 740px centered column for dedicated writing and formulas",
    icon: AlignCenter,
    containerClass: "max-w-3xl mx-auto px-2 sm:px-4 py-4 sm:py-8 min-h-[calc(100vh-210px)]",
    cardClass: "bg-[var(--surface)] border border-[var(--line)] shadow-xs rounded-2xl p-6 sm:p-10 transition-all",
  },
];

// Document Typography Presets
export const FONT_PRESETS = [
  {
    id: "sans",
    label: "Modern Sans",
    description: "Inter / Apple SF Pro",
    fontClass: "note-font-sans",
    sample: "Aa",
  },
  {
    id: "serif",
    label: "Academic Serif",
    description: "Newsreader / Textbook",
    fontClass: "note-font-serif",
    sample: "Ag",
  },
  {
    id: "mono",
    label: "Technical Mono",
    description: "JetBrains / Code note",
    fontClass: "note-font-mono",
    sample: "{;}",
  },
];

// Preset colors for font and highlight
const TEXT_COLORS = [
  { label: "Default", color: "inherit" },
  { label: "Navy", color: "#1E3A8A" },
  { label: "Amber", color: "#B45309" },
  { label: "Emerald", color: "#047857" },
  { label: "Crimson", color: "#B91C1C" },
  { label: "Purple", color: "#6D28D9" },
];

const HIGHLIGHT_COLORS = [
  { label: "None", color: "transparent" },
  { label: "Yellow", color: "#FEF08A" },
  { label: "Mint", color: "#A7F3D0" },
  { label: "Peach", color: "#FED7AA" },
  { label: "Sky", color: "#BAE6FD" },
  { label: "Rose", color: "#FECDD3" },
];

function extractFirstImage(node) {
  if (!node) return null;
  if (node.type === "image" && node.attrs?.src) return node.attrs.src;
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const found = extractFirstImage(child);
      if (found) return found;
    }
  }
  return null;
}

function refreshImageUrlsWithToken(node, accessToken) {
  if (!node) return node;
  if (node.type === "image" && node.attrs?.src) {
    let src = node.attrs.src;
    if (typeof src === "string") {
      if (src.startsWith("<svg") || src.includes("</svg>")) {
        return {
          ...node,
          attrs: {
            ...node.attrs,
            src: `data:image/svg+xml;utf8,${encodeURIComponent(src)}`,
          },
        };
      }
      if (src.includes("/notes/images/")) {
        const cleanBase = src.split("?token=")[0].split("&token=")[0];
        const updatedSrc = accessToken ? `${cleanBase}?token=${encodeURIComponent(accessToken)}` : cleanBase;
        return {
          ...node,
          attrs: {
            ...node.attrs,
            src: updatedSrc,
          },
        };
      }
    }
  }
  if (Array.isArray(node.content)) {
    return {
      ...node,
      content: node.content.map((child) => refreshImageUrlsWithToken(child, accessToken)),
    };
  }
  return node;
}

const ResizableImage = Image.extend({
  name: "image",
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("width") || element.style.width || "100%",
        renderHTML: (attributes) => ({
          width: attributes.width || "100%",
          style: `width: ${attributes.width || "100%"}; max-width: 100%;`,
        }),
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment || "center",
        }),
      },
      layout: {
        default: "block",
        parseHTML: (element) => element.getAttribute("data-layout") || "block",
        renderHTML: (attributes) => ({
          "data-layout": attributes.layout || "block",
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent, {
      attrs: ({ node }) => {
        const isRow = node.attrs.layout === "row";
        const w = isRow
          ? (node.attrs.width && node.attrs.width !== "100%" ? node.attrs.width : "48%")
          : (node.attrs.width || "100%");
        return {
          "data-layout": isRow ? "row" : "block",
          "data-image-layout": isRow ? "row" : "block",
          class: `node-image ${isRow ? "image-row-item image-node-row" : "image-block-item"}`,
          style: isRow
            ? `display: inline-flex !important; vertical-align: top !important; width: ${w} !important; max-width: 100% !important; margin: 6px 4px !important; box-sizing: border-box !important;`
            : "display: block !important; width: 100% !important; margin: 12px 0 !important; box-sizing: border-box !important;",
        };
      },
    });
  },
});

export default function NoteEditor({ go, noteId, showToast, accessToken }) {
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState("Untitled Note");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Autosave status: 'idle' | 'saving' | 'saved' | 'failed'
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Popover controls
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showImageUrlModal, setShowImageUrlModal] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [showFlowchartModal, setShowFlowchartModal] = useState(false);
  const [showQuickFlowchart, setShowQuickFlowchart] = useState(false);
  const [quickFlowchartPrompt, setQuickFlowchartPrompt] = useState("");
  const [isGeneratingAiFlowchart, setIsGeneratingAiFlowchart] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Page layout and typography states
  const [pageType, setPageType] = useState(() => {
    return localStorage.getItem("examvault_note_page_type") || "fill";
  });
  const [fontPreset, setFontPreset] = useState(() => {
    return localStorage.getItem("examvault_note_font_preset") || "sans";
  });
  const [showPageTypeMenu, setShowPageTypeMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Subject & Folder Management states
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Create Subject form
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");
  const [newSubjectInitialFolder, setNewSubjectInitialFolder] = useState("Unit 1: Fundamentals");
  const [newSubjectWithFolder, setNewSubjectWithFolder] = useState(true);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  // Create Folder form
  const [newFolderTargetSubjectId, setNewFolderTargetSubjectId] = useState("");
  const [newFolderParentFolder, setNewFolderParentFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);


  useEffect(() => {
    localStorage.setItem("examvault_note_page_type", pageType);
  }, [pageType]);

  useEffect(() => {
    localStorage.setItem("examvault_note_font_preset", fontPreset);
  }, [fontPreset]);

  // Code Simulation Studio state
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationCode, setSimulationCode] = useState("");
  const [simulationLanguage, setSimulationLanguage] = useState("cpp");

  // Monaco Code Studio Modal state
  const [monacoModalData, setMonacoModalData] = useState(null);

  const fileInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const activeSaveRequestId = useRef(0);
  const latestContentRef = useRef(null);

  // Track unsaved state for window unload
  const isDirtyRef = useRef(false);

  // Set up TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: { depth: 100 },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "cpp",
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            language: { default: "cpp" },
            themeMode: { default: "auto" },
            themePreset: { default: "one-dark-pro" },
          };
        },
        addNodeView() {
          return ReactNodeViewRenderer(InteractiveCodeBlock);
        },
      }),
      Underline,
      ResizableImage,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[500px]",
        "data-placeholder": "Start typing your revision notes, formulas, or concepts...",
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            handleUploadAndInsertImage(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            handleUploadAndInsertImage(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      isDirtyRef.current = true;
      latestContentRef.current = editor.getJSON();
      triggerDebouncedSave();
    },
  });

  // Handle uploading and inserting images into TipTap (supports single or multi-image row stacking)
  const handleUploadAndInsertImage = async (files, options = {}) => {
    const fileList = Array.isArray(files) ? files : [files];
    if (fileList.length === 0 || !accessToken) return;

    const isMultiple = fileList.length > 1;
    const defaultLayout = options.layout || (isMultiple ? "row" : "block");
    const defaultWidth = options.width || (fileList.length === 2 ? "48%" : fileList.length >= 3 ? "31%" : "100%");

    setIsUploadingImage(true);
    setSaveStatus("saving");
    try {
      for (const file of fileList) {
        if (file.size > 5 * 1024 * 1024) {
          if (showToast) showToast(`Image "${file.name}" is too large. Max size is 5MB.`);
          continue;
        }
        const res = await uploadNoteImage(file, accessToken, noteId);
        const persistentUrl = getNoteImageUrl(res.url, accessToken);

        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({
              src: persistentUrl,
              alt: file.name || "Revision Image",
              layout: defaultLayout,
              width: defaultWidth,
            })
            .run();
        }
      }
      isDirtyRef.current = true;
      saveImmediately();
      if (showToast) {
        showToast(isMultiple ? `${fileList.length} images stacked in a row!` : "Image inserted!");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      if (showToast) showToast(err.message || "Failed to upload image");
      setSaveStatus("failed");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Export current note to PDF (Direct download or Vector Print)
  const handleExportPdf = async (mode = "download") => {
    setShowPdfMenu(false);
    setIsExportingPdf(true);
    const safeTitle = title.trim() || "Untitled Note";
    if (showToast) showToast(`Exporting "${safeTitle}" to PDF...`);

    try {
      const editorElement = document.querySelector(".note-editor-content .ProseMirror");
      if (!editorElement) {
        throw new Error("Note content not found");
      }

      const currentSubject = subjects.find((s) => s.id === subjectId)?.name;
      const currentTopic = topics.find((t) => t.id === topicId)?.name;

      const printContainer = document.createElement("div");
      printContainer.className = "examvault-pdf-document";
      printContainer.style.padding = "24px";
      printContainer.style.background = "#ffffff";
      printContainer.style.color = "#1c2130";
      printContainer.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      printContainer.innerHTML = `
        <div style="border-bottom: 2px solid #e8a33d; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 10pt; color: #e8a33d; letter-spacing: 0.5px;">EXAMVAULT REVISION NOTES</span>
            <span style="font-size: 9pt; color: #6b7280;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <h1 style="font-size: 22pt; font-weight: 800; color: #14213d; margin: 4px 0 8px 0; line-height: 1.2;">
            ${safeTitle}
          </h1>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
            ${currentSubject ? `<span style="font-size: 9pt; font-weight: 600; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 999px; border: 1px solid #fde68a;">${currentSubject}</span>` : ""}
            ${currentTopic ? `<span style="font-size: 9pt; font-weight: 600; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 999px;">${currentTopic}</span>` : ""}
            <span style="font-size: 9pt; color: #9ca3af; padding: 2px 0;">${wordCount} words</span>
          </div>
        </div>
        <div class="note-editor-content" style="font-size: 11pt; line-height: 1.65;">
          ${editorElement.innerHTML}
        </div>
      `;

      if (mode === "print") {
        printNoteDocument(safeTitle, printContainer);
        if (showToast) showToast("Opening Print / Save as PDF dialog");
      } else {
        await exportNoteToPdf(safeTitle, printContainer);
        if (showToast) showToast("PDF downloaded successfully! 📄");
      }
    } catch (err) {
      console.error("PDF export failed:", err);
      if (showToast) showToast("Direct export failed. Opening print dialog...");
      const editorElement = document.querySelector(".note-editor-content .ProseMirror");
      printNoteDocument(safeTitle, editorElement);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Insert generated flowchart into TipTap editor as an inline diagram
  const handleInsertFlowchart = (svgDataUrl, title) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: svgDataUrl,
        alt: title || "Revision Flowchart",
        width: "75%",
        alignment: "center",
      })
      .run();
    isDirtyRef.current = true;
    saveImmediately();
    if (showToast) showToast("Flowchart diagram inserted into note!");
  };

  // Instant one-step generation from inline quick prompt bar
  const handleQuickGenerateFlowchart = (prompt) => {
    const text = (prompt || quickFlowchartPrompt || "").trim();
    if (!text) return;
    try {
      const { svgDataUrl, title } = generateFlowchartFromPrompt(text);
      if (svgDataUrl) {
        handleInsertFlowchart(svgDataUrl, title);
        setShowQuickFlowchart(false);
        setQuickFlowchartPrompt("");
      }
    } catch (err) {
      console.error("Failed to generate quick flowchart:", err);
    }
  };

  // Generate deep educational flowchart using Ollama LLM
  const handleOllamaGenerateFlowchart = async (prompt) => {
    const text = (prompt || quickFlowchartPrompt || "").trim();
    if (!text) return;
    setIsGeneratingAiFlowchart(true);
    if (showToast) showToast("Asking Ollama to synthesize flowchart diagram...");

    try {
      const res = await generateAiFlowchart(text, accessToken);
      if (res && res.nodes && res.nodes.length > 0) {
        const laidOut = autoLayoutNodes(res.nodes, res.edges || [], 760, 480, true);
        const svgDataUrl = renderFlowchartToSvgDataUrl(laidOut, res.edges || []);
        if (svgDataUrl) {
          handleInsertFlowchart(svgDataUrl, res.title || text);
          setShowQuickFlowchart(false);
          setQuickFlowchartPrompt("");
        }
      } else {
        throw new Error("No nodes returned by Ollama");
      }
    } catch (err) {
      console.warn("Ollama AI flowchart failed, falling back to instant algorithm:", err);
      if (showToast) showToast("Ollama unavailable, generated via instant algorithm instead.");
      handleQuickGenerateFlowchart(text);
    } finally {
      setIsGeneratingAiFlowchart(false);
    }
  };

  // Perform persistent save to backend
  const executeSave = async () => {
    if (!noteId || !accessToken) return;
    const currentReqId = ++activeSaveRequestId.current;
    setSaveStatus("saving");

    try {
      const currentDoc = latestContentRef.current || (editor ? editor.getJSON() : null);
      const textContent = editor ? editor.getText() : "";
      const rawThumb = extractFirstImage(currentDoc);
      let thumb = rawThumb;
      if (thumb && typeof thumb === "string") {
        if (thumb.includes("/notes/images/")) {
          // Store persistent clean image path without temporary tokens
          thumb = thumb.split("?")[0].split("&")[0];
        } else if (thumb.startsWith("<svg") || thumb.includes("</svg>")) {
          thumb = `data:image/svg+xml;utf8,${encodeURIComponent(thumb)}`;
        }
      }

      const payload = {
        title: title.trim() || "Untitled Note",
        content: currentDoc,
        content_text: textContent,
        thumbnail_url: thumb,
        subject_id: subjectId || null,
        topic_id: topicId || null,
      };

      const res = await updateNote(noteId, payload, accessToken);

      // Only update status if this is still the newest save response
      if (currentReqId === activeSaveRequestId.current) {
        isDirtyRef.current = false;
        setSaveStatus("saved");
        setLastSavedTime(new Date());
        if (res) {
          setNote(res);
        }
      }
    } catch (err) {
      console.error("Autosave failed:", err);
      if (currentReqId === activeSaveRequestId.current) {
        setSaveStatus("failed");
      }
    }
  };

  // Trigger debounced save (1200ms)
  const triggerDebouncedSave = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      executeSave();
    }, 1200);
  }, [noteId, accessToken, title, subjectId, topicId, editor]);

  // Save immediately (e.g. on blur, image insert, or navigation)
  const saveImmediately = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return executeSave();
  }, [noteId, accessToken, title, subjectId, topicId, editor]);

  // Warn before browser tab close if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Dismiss top action bar dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest(".note-top-dropdown")) {
        setShowPageTypeMenu(false);
        setShowFontMenu(false);
        setShowPdfMenu(false);
        setShowSubjectMenu(false);
        setShowFolderMenu(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowPageTypeMenu(false);
        setShowFontMenu(false);
        setShowPdfMenu(false);
        setShowSubjectMenu(false);
        setShowFolderMenu(false);
        setShowCreateSubjectModal(false);
        setShowCreateFolderModal(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);


  // Fetch initial note and subject/topic metadata
  useEffect(() => {
    let isMounted = true;
    const loadNoteData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [noteData, subjectsData, topicsData] = await Promise.all([
          getNote(noteId, accessToken),
          request("/subjects", { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => []),
          getAvailableNoteTopics(accessToken).catch(() => []),
        ]);

        if (!isMounted) return;

        setNote(noteData);
        setTitle(noteData.title || "Untitled Note");
        setSubjectId(noteData.subject_id || "");
        setTopicId(noteData.topic_id || "");
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        setTopics(Array.isArray(topicsData) ? topicsData : []);

        if (editor && noteData.content) {
          const freshContent = refreshImageUrlsWithToken(noteData.content, accessToken);
          editor.commands.setContent(freshContent, false);
          latestContentRef.current = freshContent;
        }

        setSaveStatus("saved");
        setLastSavedTime(new Date(noteData.updated_at));
      } catch (err) {
        console.error("Failed to load note:", err);
        if (isMounted) {
          setFetchError("Unable to load this note. It may have been deleted or you do not have permission.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (noteId && accessToken) {
      loadNoteData();
    }

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [noteId, accessToken, editor]);

  // Handle title edit change
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    isDirtyRef.current = true;
    triggerDebouncedSave();
  };

  // Handle subject change
  const handleSubjectChange = (e) => {
    const val = e.target.value;
    setSubjectId(val);
    isDirtyRef.current = true;
    triggerDebouncedSave();
  };

  // Handle topic change
  const handleTopicChange = (e) => {
    const val = e.target.value;
    setTopicId(val);
    isDirtyRef.current = true;
    triggerDebouncedSave();
  };

  // Handle back navigation safely
  const handleBack = async () => {
    if (isDirtyRef.current) {
      await saveImmediately();
    }
    go("notes");
  };

  // Manual image URL insertion
  const handleInsertByUrl = () => {
    if (!manualImageUrl.trim() || !editor) return;
    editor.chain().focus().setImage({ src: manualImageUrl.trim() }).run();
    setManualImageUrl("");
    setShowImageUrlModal(false);
    isDirtyRef.current = true;
    triggerDebouncedSave();
  };

  // Filter topics for the currently selected subject if set
  const filteredTopics = useMemo(() => {
    const safeTopics = Array.isArray(topics) ? topics : [];
    if (!subjectId) return safeTopics;
    return safeTopics.filter((t) => !t.subject_id || String(t.subject_id) === String(subjectId));
  }, [topics, subjectId]);

  // Organize topics into parsed hierarchy (e.g. Unit 1 / Chapter 1)
  const parsedTopics = useMemo(() => {
    return filteredTopics.map((t) => {
      const rawParts = (t.name || "").split("/").map((p) => p.trim()).filter(Boolean);
      const parts = rawParts.length > 0 ? rawParts : [t.name || "Untitled"];
      const isNested = parts.length > 1;
      const parentPath = isNested ? parts.slice(0, -1).join(" / ") : null;
      const leafName = parts[parts.length - 1];
      return {
        ...t,
        parts,
        isNested,
        parentPath,
        leafName,
        depth: parts.length - 1,
      };
    });
  }, [filteredTopics]);

  // Unique top-level folders / roots for parent folder selector in Create Folder modal
  const availableParentFolders = useMemo(() => {
    const currentSubId = newFolderTargetSubjectId || subjectId;
    const safeTopics = Array.isArray(topics) ? topics : [];
    const subTopics = currentSubId
      ? safeTopics.filter((t) => !t.subject_id || String(t.subject_id) === String(currentSubId))
      : safeTopics;
    const folderSet = new Set();
    subTopics.forEach((t) => {
      if (t.name) {
        folderSet.add(t.name.trim());
        const parts = t.name.split("/").map((p) => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          folderSet.add(parts[0]);
        }
      }
    });
    return Array.from(folderSet).sort();
  }, [topics, newFolderTargetSubjectId, subjectId]);


  // Handle creating new Subject
  const handleCreateSubjectSubmit = async (e) => {
    e.preventDefault();
    const cleanName = newSubjectName.trim();
    if (!cleanName || !accessToken) return;

    setIsCreatingSubject(true);
    try {
      const createdSub = await createSubject(
        {
          name: cleanName,
          description: newSubjectDescription.trim() || null,
        },
        accessToken
      );

      setSubjects((prev) => [...prev, createdSub]);
      setSubjectId(createdSub.id);

      let createdTop = null;
      if (newSubjectWithFolder && newSubjectInitialFolder.trim()) {
        try {
          createdTop = await createNoteTopic(
            {
              name: newSubjectInitialFolder.trim(),
              subject_id: createdSub.id,
            },
            accessToken
          );
          setTopics((prev) => [...prev, createdTop]);
          setTopicId(createdTop.id);
        } catch (topErr) {
          console.warn("Could not create initial folder:", topErr);
        }
      }

      setShowCreateSubjectModal(false);
      setNewSubjectName("");
      setNewSubjectDescription("");
      isDirtyRef.current = true;
      saveImmediately();

      if (showToast) {
        showToast(
          createdTop
            ? `Subject "${createdSub.name}" & folder "${createdTop.name}" created! 📁`
            : `Subject "${createdSub.name}" created & assigned! 📁`
        );
      }
    } catch (err) {
      console.error("Failed to create subject:", err);
      if (showToast) showToast(err.message || "Failed to create subject");
    } finally {
      setIsCreatingSubject(false);
    }
  };

  // Open Create Folder Modal with prefilled parameters
  const handleOpenCreateFolderModal = (targetSub = null, parentFolder = null) => {
    const subToUse = targetSub || subjectId || (subjects.length > 0 ? subjects[0].id : "");
    setNewFolderTargetSubjectId(subToUse);
    setNewFolderParentFolder(parentFolder || "");
    setNewFolderName("");
    setShowCreateFolderModal(true);
  };

  // Handle creating new Folder / Nested Subfolder
  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    const cleanFolderName = newFolderName.trim();
    if (!cleanFolderName || !newFolderTargetSubjectId || !accessToken) return;

    setIsCreatingFolder(true);
    try {
      const createdFolder = await createNoteTopic(
        {
          name: cleanFolderName,
          subject_id: newFolderTargetSubjectId,
          parent_folder: newFolderParentFolder ? newFolderParentFolder.trim() : null,
        },
        accessToken
      );

      setTopics((prev) => {
        const exists = prev.some((t) => t.id === createdFolder.id);
        return exists ? prev : [...prev, createdFolder];
      });

      if (subjectId !== newFolderTargetSubjectId) {
        setSubjectId(newFolderTargetSubjectId);
      }
      setTopicId(createdFolder.id);

      setShowCreateFolderModal(false);
      setNewFolderName("");
      setNewFolderParentFolder("");
      isDirtyRef.current = true;
      saveImmediately();

      const targetSubName = subjects.find((s) => s.id === newFolderTargetSubjectId)?.name || "Subject";
      if (showToast) {
        showToast(`Folder "${createdFolder.name}" created in ${targetSubName}! 📂`);
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
      if (showToast) showToast(err.message || "Failed to create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  };


  // Open Code Simulation Studio
  const handleOpenSimulation = (codeToSimulate, lang = "cpp") => {
    let resolvedCode = codeToSimulate;
    if (!resolvedCode || !resolvedCode.trim()) {
      resolvedCode = PRESET_ALGORITHMS[0].code;
    }
    setSimulationCode(resolvedCode);
    setSimulationLanguage(lang || "cpp");
    setShowSimulationModal(true);
  };

  // Global listener for simulation requests from InteractiveCodeBlock nodes
  useEffect(() => {
    const handleSimulateEvent = (e) => {
      if (e.detail) {
        handleOpenSimulation(e.detail.code, e.detail.language || "cpp");
      }
    };
    window.addEventListener("examvault:simulate-code", handleSimulateEvent);
    return () => window.removeEventListener("examvault:simulate-code", handleSimulateEvent);
  }, []);

  // Global listener for opening Monaco Code Editor Modal from InteractiveCodeBlock
  useEffect(() => {
    const handleOpenMonacoEvent = (e) => {
      if (e.detail) {
        setMonacoModalData({
          code: e.detail.code || "",
          language: e.detail.language || "cpp",
          pos: e.detail.pos,
          nodeSize: e.detail.nodeSize,
          editedCode: e.detail.code || "",
        });
      }
    };
    window.addEventListener("examvault:open-monaco-editor", handleOpenMonacoEvent);
    return () => window.removeEventListener("examvault:open-monaco-editor", handleOpenMonacoEvent);
  }, []);

  // Insert standard runnable C++ code block
  const handleInsertCodeBlock = () => {
    if (!editor) return;
    if (editor.isActive("codeBlock")) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    const defaultCppCode = `// Fibonacci Search Algorithm (C++)
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
}`;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "codeBlock",
        attrs: {
          language: "cpp",
          themeMode: "auto",
          themePreset: "one-dark-pro",
        },
        content: [
          {
            type: "text",
            text: defaultCppCode,
          },
        ],
      })
      .run();
  };

  const handleApplyMonacoToNote = () => {
    if (!monacoModalData || !editor) return;
    const { editedCode, pos, nodeSize } = monacoModalData;
    if (typeof pos === "number" && typeof nodeSize === "number") {
      try {
        const from = pos + 1;
        const to = pos + nodeSize - 1;
        const tr = editor.state.tr.replaceWith(
          from,
          to,
          editedCode ? editor.state.schema.text(editedCode) : []
        );
        editor.view.dispatch(tr);
        if (showToast) showToast("Code changes applied to note!");
      } catch (err) {
        console.warn("Could not replace code in note:", err);
      }
    }
    setMonacoModalData(null);
  };

  // Word count, Character count, Reading time
  const textContent = editor ? editor.getText() : "";
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const currentSubjectObj = (Array.isArray(subjects) ? subjects : []).find(
    (s) => String(s.id) === String(subjectId)
  );
  const currentSubject = currentSubjectObj?.name || "";
  const currentTopicObj = (Array.isArray(topics) ? topics : []).find(
    (t) => String(t.id) === String(topicId)
  );
  const currentTopic = currentTopicObj?.name || "";

  const selectedPageTypeConfig = PAGE_TYPES.find((p) => p.id === pageType) || PAGE_TYPES[0];
  const selectedFontConfig = FONT_PRESETS.find((f) => f.id === fontPreset) || FONT_PRESETS[0];

  // Global macOS Keyboard Shortcuts (⌘S to save immediately, Esc to dismiss menus)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        saveImmediately();
      }
      if (e.key === "Escape") {
        if (showQuickFlowchart) setShowQuickFlowchart(false);
        if (showImageUrlModal) setShowImageUrlModal(false);
        if (showPdfMenu) setShowPdfMenu(false);
        if (showPageTypeMenu) setShowPageTypeMenu(false);
        if (showFontMenu) setShowFontMenu(false);
        if (showColorPicker) setShowColorPicker(false);
        if (showHighlightPicker) setShowHighlightPicker(false);
        if (showShortcutsModal) setShowShortcutsModal(false);
        if (showSimulationModal) setShowSimulationModal(false);
        if (monacoModalData) setMonacoModalData(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showQuickFlowchart, showImageUrlModal, showPdfMenu, showPageTypeMenu,
    showFontMenu, showColorPicker, showHighlightPicker, showShortcutsModal,
    showSimulationModal, monacoModalData
  ]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-28 text-center animate-fade-in">
        <div className="sa-card p-8 shadow-xl border border-[var(--line)]">
          <Loader2 size={32} className="animate-spin text-[var(--accent)] mx-auto mb-3" />
          <h3 className="font-semibold text-sm text-[var(--text)]">Opening Note...</h3>
          <p className="text-xs mt-1 text-[var(--muted)]">Loading document and diagram components</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-md mx-auto py-28 text-center animate-fade-in">
        <div className="sa-card p-8 shadow-xl border border-[var(--line)]">
          <AlertCircle size={36} className="text-[var(--danger)] mx-auto mb-3" />
          <h2 className="font-bold text-base mb-1 text-[var(--text)]">Document Unavailable</h2>
          <p className="text-xs mb-5 text-[var(--muted)]">{fetchError}</p>
          <button
            onClick={() => go("notes")}
            className="sa-btn-accent px-4 py-2 text-xs font-semibold rounded-lg shadow-md"
          >
            Return to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col min-h-0 bg-[var(--paper)] transition-all duration-200 select-text ${
        isMaximized
          ? "fixed inset-0 z-50 overflow-hidden bg-[var(--paper)]"
          : "w-full overflow-hidden"
      }`}
    >
      {/* =========================================================================
          Top Document Header: Navigation, Meta, Page Type & Actions
          ========================================================================= */}
      <div className="flex-shrink-0 z-30 bg-[var(--surface)] border-b border-[var(--line)] shadow-2xs select-none">
        {/* Row 1: Document Navigation Bar */}
        <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 border-b border-[var(--line-subtle)] flex-wrap">
          {/* Left: Back button + Breadcrumb + Synced Title display */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className="sa-btn-outline px-2.5 py-1 text-xs flex items-center gap-1.5 font-medium rounded-lg hover:border-[var(--accent)] transition-all flex-shrink-0"
              title="Return to Notes (Esc)"
            >
              <ArrowLeft size={13} />
              <span>Notes</span>
            </button>

            <span className="text-[var(--line)] text-sm hidden sm:inline">/</span>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-[var(--text)] truncate max-w-[130px] sm:max-w-[200px] md:max-w-[280px]">
                {title || "Untitled Note"}
              </span>

              {/* Autosave Status Pill */}
              <div className="flex-shrink-0 flex items-center">
                {saveStatus === "saving" ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">
                    <Loader2 size={10} className="animate-spin" />
                    <span className="hidden md:inline">Saving</span>
                  </span>
                ) : saveStatus === "saved" ? (
                  <span
                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                    title={lastSavedTime ? `Saved at ${lastSavedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Saved to cloud"}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="hidden md:inline">Saved</span>
                  </span>
                ) : (
                  <button
                    onClick={saveImmediately}
                    className="flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-full transition-colors"
                    title="Save failed, click to retry"
                  >
                    <AlertCircle size={10} />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Center / Right: Layout Switcher, Font Switcher, Subject/Topic, PDF, Fullscreen */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Page Type Selector Dropdown */}
            <div className="relative note-top-dropdown">
              <button
                onClick={() => {
                  setShowPageTypeMenu(!showPageTypeMenu);
                  setShowFontMenu(false);
                  setShowPdfMenu(false);
                  setShowSubjectMenu(false);
                  setShowFolderMenu(false);
                }}
                className={`flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                  showPageTypeMenu
                    ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] border-[var(--accent)]"
                    : "bg-[var(--input-bg)] border-[var(--line)] text-[var(--text)] hover:border-[var(--line-subtle)]"
                }`}
                title="Change Document Page Type (Fill to page, Standard A4, Focus)"
              >
                <Layout size={12} className="text-[var(--accent)]" />
                <span className="font-semibold">{selectedPageTypeConfig.label}</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showPageTypeMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-64 sa-card p-1.5 shadow-2xl z-50 text-xs space-y-1 animate-fade-in border border-[var(--line)] bg-[var(--surface)]">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Document Page Layout
                  </div>
                  {PAGE_TYPES.map((pt) => {
                    const IconComp = pt.icon;
                    const isSelected = pageType === pt.id;
                    return (
                      <button
                        key={pt.id}
                        onClick={() => {
                          setPageType(pt.id);
                          setShowPageTypeMenu(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors ${
                          isSelected
                            ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold"
                            : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md mt-0.5 ${isSelected ? "bg-[var(--accent)] text-slate-950" : "bg-[var(--chip-bg)] text-[var(--muted)]"}`}>
                          <IconComp size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-xs">{pt.label}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[var(--muted)]">{pt.badge}</span>
                          </div>
                          <p className="text-[10px] text-[var(--muted)] line-clamp-1 mt-0.5 leading-tight">{pt.description}</p>
                        </div>
                        {isSelected && <Check size={12} className="text-[var(--accent)] mt-1 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Typography Preset Dropdown */}
            <div className="relative note-top-dropdown">
              <button
                onClick={() => {
                  setShowFontMenu(!showFontMenu);
                  setShowPageTypeMenu(false);
                  setShowPdfMenu(false);
                  setShowSubjectMenu(false);
                  setShowFolderMenu(false);
                }}
                className={`flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                  showFontMenu
                    ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] border-[var(--accent)]"
                    : "bg-[var(--input-bg)] border-[var(--line)] text-[var(--text)] hover:border-[var(--line-subtle)]"
                }`}
                title="Select Note Typography Style"
              >
                <Type size={12} className="text-[var(--accent)]" />
                <span className="hidden sm:inline font-medium">{selectedFontConfig.label}</span>
                <span className="sm:hidden font-mono text-[11px]">{selectedFontConfig.sample}</span>
                <ChevronDown size={11} className="opacity-60" />
              </button>

              {showFontMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 sa-card p-1.5 shadow-2xl z-50 text-xs space-y-0.5 animate-fade-in border border-[var(--line)] bg-[var(--surface)]">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Typography Style
                  </div>
                  {FONT_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFontPreset(f.id);
                        setShowFontMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        fontPreset === f.id
                          ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs w-4 text-[var(--muted)]">{f.sample}</span>
                        <span>{f.label}</span>
                      </div>
                      {fontPreset === f.id && <Check size={12} className="text-[var(--accent)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject Selector & Quick Add */}
            <div className="relative note-top-dropdown">
              <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--input-bg)] hover:border-[var(--line-subtle)] transition-colors">
                <button
                  id="select-note-subject"
                  type="button"
                  onClick={() => {
                    setShowSubjectMenu(!showSubjectMenu);
                    setShowFolderMenu(false);
                    setShowPageTypeMenu(false);
                    setShowFontMenu(false);
                    setShowPdfMenu(false);
                  }}
                  className={`flex items-center gap-1.5 h-7.5 px-2 text-xs transition-colors max-w-[120px] sm:max-w-[145px] outline-none rounded-l-lg ${
                    showSubjectMenu
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "text-[var(--text)]"
                  }`}
                  title="Assign Subject"
                >
                  <BookOpen size={12} className="text-amber-500 shrink-0" />
                  <span className="truncate">
                    {subjects.find((s) => String(s.id) === String(subjectId))?.name || "Subject"}
                  </span>
                  <ChevronDown size={11} className="opacity-60 shrink-0 ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewSubjectName("");
                    setNewSubjectDescription("");
                    setNewSubjectInitialFolder("Unit 1: Fundamentals");
                    setNewSubjectWithFolder(true);
                    setShowCreateSubjectModal(true);
                    setShowSubjectMenu(false);
                  }}
                  className="h-7.5 px-1.5 border-l border-[var(--line)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)] text-[var(--muted)] transition-colors rounded-r-lg"
                  title="Create New Subject (+)"
                >
                  <Plus size={12} />
                </button>
              </div>

              {showSubjectMenu && (
                <div className="absolute left-0 sm:right-auto top-full mt-1.5 w-64 sa-card p-1.5 shadow-2xl z-50 text-xs animate-fade-in border border-[var(--line)] bg-[var(--surface)]">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    <span>Subjects</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSubjectName("");
                        setNewSubjectDescription("");
                        setNewSubjectInitialFolder("Unit 1: Fundamentals");
                        setNewSubjectWithFolder(true);
                        setShowCreateSubjectModal(true);
                        setShowSubjectMenu(false);
                      }}
                      className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold normal-case text-xs"
                    >
                      <Plus size={11} /> New
                    </button>
                  </div>

                  {subjects.length > 4 && (
                    <div className="px-1.5 pb-1.5">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-2.5 text-[var(--muted)]" />
                        <input
                          type="text"
                          placeholder="Search subjects..."
                          value={subjectSearchQuery}
                          onChange={(e) => setSubjectSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs rounded-md bg-black/5 dark:bg-white/5 border border-[var(--line)] outline-none text-[var(--text)]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="max-h-52 overflow-y-auto space-y-0.5 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSubjectId("");
                        setTopicId("");
                        setShowSubjectMenu(false);
                        isDirtyRef.current = true;
                        triggerDebouncedSave();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        !subjectId
                          ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--muted)]"
                      }`}
                    >
                      <span className="italic">(No Subject)</span>
                      {!subjectId && <Check size={12} className="text-[var(--accent)]" />}
                    </button>

                    {subjects
                      .filter((s) => !subjectSearchQuery || s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()))
                      .map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setSubjectId(s.id);
                            setShowSubjectMenu(false);
                            isDirtyRef.current = true;
                            triggerDebouncedSave();
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                            String(subjectId) === String(s.id)
                              ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold"
                              : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <BookOpen size={12} className="text-amber-500/80 shrink-0" />
                            <span className="truncate">{s.name}</span>
                          </div>
                          {String(subjectId) === String(s.id) && <Check size={12} className="text-[var(--accent)] shrink-0" />}
                        </button>
                      ))}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => {
                        setNewSubjectName("");
                        setNewSubjectDescription("");
                        setNewSubjectInitialFolder("Unit 1: Fundamentals");
                        setNewSubjectWithFolder(true);
                        setShowCreateSubjectModal(true);
                        setShowSubjectMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--accent-soft)] text-[var(--accent)] font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Plus size={13} />
                      <span>Create New Subject...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Folder / Nested Subfolder Selector & Quick Add */}
            <div className="relative note-top-dropdown">
              <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--input-bg)] hover:border-[var(--line-subtle)] transition-colors">
                <button
                  id="select-note-topic"
                  type="button"
                  onClick={() => {
                    setShowFolderMenu(!showFolderMenu);
                    setShowSubjectMenu(false);
                    setShowPageTypeMenu(false);
                    setShowFontMenu(false);
                    setShowPdfMenu(false);
                  }}
                  className={`flex items-center gap-1.5 h-7.5 px-2 text-xs transition-colors max-w-[120px] sm:max-w-[155px] outline-none rounded-l-lg ${
                    showFolderMenu
                      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                      : "text-[var(--text)]"
                  }`}
                  title="Assign Folder or Subfolder"
                >
                  <Folder size={12} className="text-sky-500 shrink-0" />
                  <span className="truncate">
                    {topics.find((t) => String(t.id) === String(topicId))?.name || "Folder"}
                  </span>
                  <ChevronDown size={11} className="opacity-60 shrink-0 ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreateFolderModal()}
                  className="h-7.5 px-1.5 border-l border-[var(--line)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)] text-[var(--muted)] transition-colors rounded-r-lg"
                  title="Create Folder or Nested Subfolder (+)"
                >
                  <Plus size={12} />
                </button>
              </div>

              {showFolderMenu && (
                <div className="absolute left-0 sm:right-auto top-full mt-1.5 w-72 sa-card p-1.5 shadow-2xl z-50 text-xs animate-fade-in border border-[var(--line)] bg-[var(--surface)]">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    <span>Folders & Subfolders</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenCreateFolderModal();
                        setShowFolderMenu(false);
                      }}
                      className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold normal-case text-xs"
                    >
                      <Plus size={11} /> New
                    </button>
                  </div>

                  {parsedTopics.length > 4 && (
                    <div className="px-1.5 pb-1.5">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-2.5 text-[var(--muted)]" />
                        <input
                          type="text"
                          placeholder="Filter folders..."
                          value={folderSearchQuery}
                          onChange={(e) => setFolderSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs rounded-md bg-black/5 dark:bg-white/5 border border-[var(--line)] outline-none text-[var(--text)]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTopicId("");
                        setShowFolderMenu(false);
                        isDirtyRef.current = true;
                        triggerDebouncedSave();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        !topicId
                          ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--muted)]"
                      }`}
                    >
                      <span className="italic">(No Folder)</span>
                      {!topicId && <Check size={12} className="text-[var(--accent)]" />}
                    </button>

                    {parsedTopics.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-[var(--muted)]">
                        <p>No folders in this subject yet.</p>
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenCreateFolderModal();
                            setShowFolderMenu(false);
                          }}
                          className="mt-1.5 text-xs text-[var(--accent)] font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <Plus size={12} /> Create first folder
                        </button>
                      </div>
                    ) : (
                      parsedTopics
                        .filter((t) => !folderSearchQuery || t.name.toLowerCase().includes(folderSearchQuery.toLowerCase()))
                        .map((t) => (
                          <div
                            key={t.id}
                            className="group flex items-center justify-between rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors pr-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setTopicId(t.id);
                                setShowFolderMenu(false);
                                isDirtyRef.current = true;
                                triggerDebouncedSave();
                              }}
                              className={`flex-1 text-left px-2.5 py-1.5 flex items-center justify-between truncate ${
                                String(topicId) === String(t.id)
                                  ? "text-[var(--accent-ink)] font-semibold"
                                  : "text-[var(--text)]"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {t.isNested ? (
                                  <div className="flex items-center gap-1.5 pl-3 truncate">
                                    <span className="text-[var(--muted)] text-[11px]">↳</span>
                                    <FolderOpen size={12} className="text-sky-500/80 shrink-0" />
                                    <span className="truncate">{t.leafName}</span>
                                    <span className="text-[10px] text-[var(--muted)] opacity-75 truncate">
                                      ({t.parentPath})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Folder size={13} className="text-amber-500 shrink-0" />
                                    <span className="truncate font-medium">{t.name}</span>
                                  </div>
                                )}
                              </div>
                              {String(topicId) === String(t.id) && <Check size={12} className="text-[var(--accent)] shrink-0 ml-1" />}
                            </button>

                            {/* Quick Add Nested Subfolder button on root folders */}
                            {!t.isNested && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCreateFolderModal(subjectId, t.name);
                                  setShowFolderMenu(false);
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)] text-[var(--muted)] px-1.5 py-0.5 rounded transition-all text-[10px] flex items-center gap-0.5 shrink-0"
                                title={`Add nested subfolder inside "${t.name}"`}
                              >
                                <Plus size={10} />
                                <span className="text-[9px]">Sub</span>
                              </button>
                            )}
                          </div>
                        ))
                    )}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenCreateFolderModal();
                        setShowFolderMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--accent-soft)] text-[var(--accent)] font-semibold flex items-center gap-2 transition-colors"
                    >
                      <FolderPlus size={13} />
                      <span>Create New Folder / Subfolder...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PDF Export Dropdown */}
            <div className="relative note-top-dropdown">
              <button
                onClick={() => handleExportPdf("download")}
                disabled={isExportingPdf}
                className="sa-btn-outline flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg text-xs font-semibold"
                title="Export Note to PDF"
              >
                {isExportingPdf ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} className="text-[var(--accent)]" />
                )}
                <span className="hidden sm:inline">PDF</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPdfMenu(!showPdfMenu);
                    setShowPageTypeMenu(false);
                    setShowFontMenu(false);
                    setShowSubjectMenu(false);
                    setShowFolderMenu(false);
                  }}
                  className="pl-0.5 hover:opacity-75"
                >
                  <ChevronDown size={11} />
                </span>
              </button>

              {showPdfMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 sa-card p-1.5 shadow-2xl z-50 text-xs space-y-0.5 animate-fade-in border border-[var(--line)] bg-[var(--surface)]">
                  <button
                    onClick={() => handleExportPdf("download")}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium text-[var(--text)]"
                  >
                    <Download size={13} className="text-[var(--accent)]" />
                    <span>Download PDF (.pdf)</span>
                  </button>
                  <button
                    onClick={() => handleExportPdf("print")}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 font-medium text-[var(--text)]"
                  >
                    <Printer size={13} className="text-purple-500" />
                    <span>Print / Vector PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Distraction-Free / Fullscreen Toggle */}
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={isMaximized ? "Exit distraction-free mode" : "Distraction-free full screen"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* Row 2: Sleek Docked Formatting Ribbon */}
        <div className="px-3 sm:px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto sa-scroll bg-[var(--surface)]/95 backdrop-blur-md">
          {/* Undo / Redo */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)]/40 flex-shrink-0">
            <button
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              title="Undo (⌘Z)"
              className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              title="Redo (⌘Y / ⌘Shift+Z)"
              className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
            >
              <Redo2 size={13} />
            </button>
          </div>

          {/* Headings Segment */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)]/40 flex-shrink-0">
            <button
              onClick={() => editor?.chain().focus().setParagraph().run()}
              title="Paragraph (Normal Text)"
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                editor?.isActive("paragraph") && !editor?.isActive("heading")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              P
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                editor?.isActive("heading", { level: 1 })
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              H1
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                editor?.isActive("heading", { level: 2 })
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              H2
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                editor?.isActive("heading", { level: 3 })
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              H3
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              title="Quote / Callout Block"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("blockquote")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Quote size={12} />
            </button>
          </div>

          {/* Inline Formatting Segment */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)]/40 flex-shrink-0">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              title="Bold (⌘B)"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("bold")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Bold size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              title="Italic (⌘I)"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("italic")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Italic size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              title="Underline (⌘U)"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("underline")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <UnderlineIcon size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("strike")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Strikethrough size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleCode().run()}
              title="Inline Code"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("code")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Code2 size={13} />
            </button>
          </div>

          {/* Lists Segment */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)]/40 flex-shrink-0">
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              title="Bulleted List"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("bulletList")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <List size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("orderedList")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <ListOrdered size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              title="Interactive Checklist (Tasks)"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive("taskList")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <CheckSquare size={13} />
            </button>
          </div>

          {/* Alignment Segment */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)]/40 flex-shrink-0">
            <button
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              title="Align Left"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive({ textAlign: "left" })
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <AlignLeft size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              title="Align Center"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive({ textAlign: "center" })
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <AlignCenter size={13} />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              title="Align Right"
              className={`p-1.5 rounded-md transition-colors ${
                editor?.isActive({ textAlign: "right" })
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <AlignRight size={13} />
            </button>
          </div>

          {/* Color & Highlight */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                }}
                title="Text Color"
                className="p-1.5 rounded-lg text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Palette size={13} />
              </button>
              {showColorPicker && (
                <div className="absolute left-0 top-full mt-1.5 p-2.5 sa-card shadow-2xl z-40 flex items-center gap-2 border border-[var(--line)] bg-[var(--surface)]">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => {
                        if (c.color === "inherit") {
                          editor?.chain().focus().unsetColor().run();
                        } else {
                          editor?.chain().focus().setColor(c.color).run();
                        }
                        setShowColorPicker(false);
                      }}
                      title={c.label}
                      className="w-5 h-5 rounded-full border border-black/10 dark:border-white/20 hover:scale-125 transition-transform shadow-xs"
                      style={{ backgroundColor: c.color === "inherit" ? "var(--text)" : c.color }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                }}
                title="Highlight"
                className="p-1.5 rounded-lg text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Highlighter size={13} />
              </button>
              {showHighlightPicker && (
                <div className="absolute left-0 top-full mt-1.5 p-2.5 sa-card shadow-2xl z-40 flex items-center gap-2 border border-[var(--line)] bg-[var(--surface)]">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => {
                        if (c.color === "transparent") {
                          editor?.chain().focus().unsetHighlight().run();
                        } else {
                          editor?.chain().focus().setHighlight({ color: c.color }).run();
                        }
                        setShowHighlightPicker(false);
                      }}
                      title={c.label}
                      className="w-5 h-5 rounded-full border border-black/10 dark:border-white/20 hover:scale-125 transition-transform shadow-xs"
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
              title="Clear Formatting"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <RemoveFormatting size={13} />
            </button>

            <button
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="Insert Horizontal Divider"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Minus size={13} />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[var(--line)] mx-0.5 flex-shrink-0" />

          {/* Flowchart studio */}
          <button
            onClick={() => setShowQuickFlowchart((prev) => !prev)}
            title="Flowchart Studio / AI Prompt Generator"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex-shrink-0 border ${
              showQuickFlowchart
                ? "bg-[var(--accent)] text-slate-950 border-[var(--accent)] shadow-xs"
                : "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30 hover:brightness-105"
            }`}
          >
            <GitBranch size={13} />
            <span>Flowchart</span>
            <Sparkles size={11} className={showQuickFlowchart ? "text-slate-950" : "text-[var(--accent)]"} />
          </button>

          {/* Interactive Code Block & Simulation */}
          <div className="flex items-center p-0.5 rounded-lg border border-[var(--line)] bg-[var(--chip-bg)]/40 flex-shrink-0">
            <button
              onClick={handleInsertCodeBlock}
              title="Insert Interactive C++ Code Block"
              className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                editor?.isActive("codeBlock")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-2xs"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Code2 size={13} />
              <span className="hidden sm:inline">C++ Code</span>
            </button>
            <button
              onClick={() => {
                const selected = editor ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to) : "";
                handleOpenSimulation(selected);
              }}
              title="Launch Code Execution Simulator"
              className="sa-btn-accent px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 shadow-2xs"
            >
              <Play size={10} className="fill-current" />
              <span>Simulate</span>
            </button>
          </div>

          {/* Image upload & insertion */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUploadAndInsertImage(Array.from(e.target.files));
                }
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              title="Insert Image"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[var(--chip-bg)] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text)] border border-[var(--line)] transition-colors"
            >
              {isUploadingImage ? (
                <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
              ) : (
                <ImageIcon size={12} className="text-[var(--accent)]" />
              )}
              <span>Image</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              title="Select 2+ images to stack in a row"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Columns size={12} />
              <span className="hidden md:inline">Stack</span>
            </button>

            <button
              onClick={() => setShowImageUrlModal(true)}
              title="Insert image by URL"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <LinkIcon size={12} />
            </button>
          </div>
        </div>

        {/* Quick Flowchart Prompt Bar */}
        {showQuickFlowchart && (
          <div className="px-3 sm:px-5 py-2.5 border-t border-[var(--line)] bg-[var(--accent-soft)]/15 flex items-center gap-2 animate-fade-in shadow-xs flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">
              <Sparkles size={14} className="text-[var(--accent)]" />
              <span>Flowchart Prompt:</span>
            </div>
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={quickFlowchartPrompt}
                onChange={(e) => setQuickFlowchartPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickFlowchartPrompt.trim()) {
                    e.preventDefault();
                    handleQuickGenerateFlowchart(quickFlowchartPrompt);
                  }
                }}
                placeholder="e.g. 'root Plant, children Stem, Leaf, Root' or 'A -> B -> C' or 'Binary Search'..."
                className="w-full text-xs h-7.5 px-3 rounded-lg bg-[var(--input-bg)] border border-[var(--line)] outline-none focus:border-[var(--accent)] pr-7 text-[var(--text)]"
                autoFocus
              />
              {quickFlowchartPrompt && (
                <button
                  onClick={() => setQuickFlowchartPrompt("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] text-xs font-bold p-1"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => handleQuickGenerateFlowchart(quickFlowchartPrompt)}
              disabled={!quickFlowchartPrompt.trim() || isGeneratingAiFlowchart}
              className="sa-btn-accent px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50 transition-all"
              title="Generate flowchart and insert directly into your note (Enter)"
            >
              <Check size={12} />
              <span>Generate & Insert</span>
            </button>
            <button
              onClick={() => handleOllamaGenerateFlowchart(quickFlowchartPrompt)}
              disabled={!quickFlowchartPrompt.trim() || isGeneratingAiFlowchart}
              className="px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 bg-purple-600/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-600/25 active:scale-98 disabled:opacity-50 transition-all"
              title="Use local Ollama AI to synthesize multi-node flowchart and insert"
            >
              {isGeneratingAiFlowchart ? (
                <>
                  <Loader2 size={12} className="animate-spin text-purple-500" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Bot size={12} className="text-purple-500" />
                  <span>Ollama AI</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowFlowchartModal(true)}
              className="sa-btn-outline px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
              title="Open visual drag-and-drop studio"
            >
              <span>Open Studio ↗</span>
            </button>
            <button
              onClick={() => setShowQuickFlowchart(false)}
              className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          Scrollable Document Canvas Area (Fill to Page / A4 / Focus)
          ========================================================================= */}
      <main className="flex-1 overflow-y-auto sa-scroll w-full py-4 sm:py-8 px-2 sm:px-6">
        <div className={selectedPageTypeConfig.containerClass}>
          <div className={selectedPageTypeConfig.cardClass}>
            {/* Document In-Paper Header */}
            <div className="mb-6 pb-5 border-b border-[var(--line-subtle)]">
              <input
                id="input-note-title"
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={saveImmediately}
                placeholder="Untitled Note..."
                className={`w-full text-2xl sm:text-4xl font-bold bg-transparent outline-none border-b border-transparent hover:border-[var(--line)] focus:border-[var(--accent)] text-[var(--text)] transition-all placeholder:text-[var(--muted)]/40 pb-2 mb-3 tracking-tight ${
                  fontPreset === "serif" ? "sa-serif" : ""
                }`}
              />

              <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--muted)]">
                {/* Subject Chip */}
                {currentSubject ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-[var(--accent-soft)] text-[var(--accent-ink)] border border-[var(--accent)]/30">
                    <BookOpen size={11} />
                    <span>{currentSubject}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-[var(--chip-bg)] text-[var(--muted)] border border-[var(--line)]">
                    <span>No Subject</span>
                  </span>
                )}

                {/* Topic Chip */}
                {currentTopic && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-[var(--info-soft)] text-[var(--info)] border border-[var(--info)]/20">
                    <span>{currentTopic}</span>
                  </span>
                )}

                {/* Reading Stats */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--chip-bg)]/60 text-[var(--muted)] border border-[var(--line-subtle)]">
                  <Clock size={11} />
                  <span>{readingTimeMin} min read</span>
                  <span className="opacity-40">•</span>
                  <span>{wordCount} words</span>
                </span>

                {/* Last Saved Stamp */}
                {lastSavedTime && (
                  <span className="text-[11px] text-[var(--muted)] pl-1">
                    Last updated {lastSavedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>

            {/* Note Editor Body Canvas */}
            <div className={`note-editor-content note-font-${fontPreset}`}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          Bottom Document Status Bar
          ========================================================================= */}
      <footer className="flex-shrink-0 z-20 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md px-4 py-1.5 text-xs text-[var(--muted)] flex items-center justify-between gap-3 select-none flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-medium text-[var(--text)]">{wordCount} words</span>
          <span className="opacity-40">•</span>
          <span>{charCount} characters</span>
          <span className="opacity-40">•</span>
          <span>~{readingTimeMin} min read</span>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saving" ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <Loader2 size={11} className="animate-spin" />
              <span>Saving changes...</span>
            </span>
          ) : saveStatus === "saved" ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>ExamVault Cloud Synced</span>
            </span>
          ) : (
            <button onClick={saveImmediately} className="text-red-500 font-medium hover:underline">
              Save failed • Click to retry
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPageTypeMenu(true)}
            className="hover:text-[var(--text)] transition-colors flex items-center gap-1 text-[11px]"
            title="Change Page Layout"
          >
            <Layout size={12} className="text-[var(--accent)]" />
            <span>Layout: {selectedPageTypeConfig.label}</span>
          </button>
          <span className="opacity-40">•</span>
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="hover:text-[var(--text)] transition-colors flex items-center gap-1 text-[11px]"
            title="Keyboard shortcuts"
          >
            <Keyboard size={12} />
            <span>Shortcuts</span>
          </button>
        </div>
      </footer>

      {/* Insert Image URL Modal */}
      {showImageUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="sa-card max-w-md w-full p-6 shadow-2xl border border-[var(--line)] bg-[var(--surface)]">
            <h3 className="font-semibold text-base mb-1 text-[var(--text)]">Insert Image by URL</h3>
            <p className="text-xs mb-4 text-[var(--muted)]">
              Paste a web image or diagram URL to insert directly into your document.
            </p>
            <input
              type="url"
              value={manualImageUrl}
              onChange={(e) => setManualImageUrl(e.target.value)}
              placeholder="https://example.com/diagram.png"
              className="w-full text-xs h-9 px-3 rounded-lg bg-[var(--input-bg)] border border-[var(--line)] outline-none focus:border-[var(--accent)] text-[var(--text)] mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowImageUrlModal(false)}
                className="sa-btn-outline px-3.5 py-1.5 text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertByUrl}
                disabled={!manualImageUrl.trim()}
                className="sa-btn-accent px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm active:scale-98 transition-all disabled:opacity-50"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flowchart & Diagram Studio Modal */}
      <FlowchartModal
        isOpen={showFlowchartModal}
        initialPrompt={quickFlowchartPrompt}
        onClose={() => setShowFlowchartModal(false)}
        onInsert={handleInsertFlowchart}
      />

      {/* Code Simulation Studio Modal */}
      <CodeSimulationModal
        isOpen={showSimulationModal}
        initialCode={simulationCode}
        initialLanguage={simulationLanguage}
        onClose={() => setShowSimulationModal(false)}
        accessToken={accessToken}
      />

      {/* Monaco Code Studio Modal */}
      {monacoModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02] flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                  <Code2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
                    <span>Monaco Code Studio</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold uppercase">
                      VS Code Engine
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Edit with famous color themes, auto-formatter, dark/light switch & sandbox runner
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyMonacoToNote}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>Apply to Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonacoModalData(null)}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto sa-scroll bg-[var(--paper)]">
              <CodingWorkspace
                value={monacoModalData.editedCode}
                onChange={(newVal) =>
                  setMonacoModalData((prev) => (prev ? { ...prev, editedCode: newVal } : null))
                }
                defaultLanguage={monacoModalData.language}
                onRun={async (code, customInput) => {
                  const res = await fetch(`${API_BASE_URL}/quiz/code/run`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      code,
                      language: monacoModalData.language || "python",
                      stdin: customInput || "",
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.detail || "Execution failed.");
                  return data;
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="sa-card max-w-md w-full p-6 shadow-2xl border border-[var(--line)] bg-[var(--surface)] animate-scale-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-[var(--accent)]" />
                <h3 className="font-bold text-sm text-[var(--text)]">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[var(--line-subtle)]">
                <span className="text-[var(--muted)]">Save note immediately</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--line)] font-mono text-[11px] font-semibold text-[var(--text)]">⌘ + S</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[var(--line-subtle)]">
                <span className="text-[var(--muted)]">Toggle bold</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--line)] font-mono text-[11px] font-semibold text-[var(--text)]">⌘ + B</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[var(--line-subtle)]">
                <span className="text-[var(--muted)]">Toggle italic</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--line)] font-mono text-[11px] font-semibold text-[var(--text)]">⌘ + I</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[var(--line-subtle)]">
                <span className="text-[var(--muted)]">Toggle underline</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--line)] font-mono text-[11px] font-semibold text-[var(--text)]">⌘ + U</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[var(--line-subtle)]">
                <span className="text-[var(--muted)]">Undo change</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--line)] font-mono text-[11px] font-semibold text-[var(--text)]">⌘ + Z</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[var(--line-subtle)]">
                <span className="text-[var(--muted)]">Redo change</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--line)] font-mono text-[11px] font-semibold text-[var(--text)]">⌘ + Y</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[var(--muted)]">Dismiss dialogs & menus</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--line)] font-mono text-[11px] font-semibold text-[var(--text)]">Esc</kbd>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-[var(--line)] flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="sa-btn-accent px-4 py-1.5 text-xs font-semibold rounded-lg"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Create Subject Modal
          ========================================================================= */}
      {showCreateSubjectModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowCreateSubjectModal(false)}
        >
          <div
            className="sa-card max-w-md w-full p-6 shadow-2xl border border-[var(--line)] bg-[var(--surface)] space-y-4 rounded-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text)]">Create New Subject</h3>
                  <p className="text-xs text-[var(--muted)]">Organize notes, study material & past papers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateSubjectModal(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[var(--muted)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Computer Networks, Machine Learning, DBMS"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--line)] text-[var(--text)] focus:border-[var(--accent)] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Description / Course Code <span className="text-[var(--muted)] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS401 — Semester 6 Core Curriculum"
                  value={newSubjectDescription}
                  onChange={(e) => setNewSubjectDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--line)] text-[var(--text)] focus:border-[var(--accent)] outline-none transition-colors"
                />
              </div>

              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--line)] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--text)]">
                  <input
                    type="checkbox"
                    checked={newSubjectWithFolder}
                    onChange={(e) => setNewSubjectWithFolder(e.target.checked)}
                    className="rounded accent-[var(--accent)]"
                  />
                  <span>Create initial folder inside this subject</span>
                </label>
                {newSubjectWithFolder && (
                  <input
                    type="text"
                    placeholder="e.g. Unit 1: Fundamentals"
                    value={newSubjectInitialFolder}
                    onChange={(e) => setNewSubjectInitialFolder(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--input-bg)] border border-[var(--line)] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setShowCreateSubjectModal(false)}
                  className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubject || !newSubjectName.trim()}
                  className="sa-btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  {isCreatingSubject ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Create & Assign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          Create Nested Folder / Subfolder Modal
          ========================================================================= */}
      {showCreateFolderModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowCreateFolderModal(false)}
        >
          <div
            className="sa-card max-w-md w-full p-6 shadow-2xl border border-[var(--line)] bg-[var(--surface)] space-y-4 rounded-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                  <FolderTree size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text)]">Create Folder / Subfolder</h3>
                  <p className="text-xs text-[var(--muted)]">Organize notes into chapters, units, or nested modules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[var(--muted)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              {/* Target Subject Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--text)]">
                    Parent Subject <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateFolderModal(false);
                      setNewSubjectName("");
                      setNewSubjectDescription("");
                      setNewSubjectInitialFolder("Unit 1: Fundamentals");
                      setNewSubjectWithFolder(true);
                      setShowCreateSubjectModal(true);
                    }}
                    className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={10} /> New Subject
                  </button>
                </div>
                {subjects.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                    No subjects available. Please create a subject first before creating folders.
                  </div>
                ) : (
                  <select
                    value={newFolderTargetSubjectId}
                    onChange={(e) => {
                      setNewFolderTargetSubjectId(e.target.value);
                      setNewFolderParentFolder("");
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--line)] text-[var(--text)] outline-none focus:border-[var(--accent)] cursor-pointer"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Nesting Mode / Parent Folder Selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Folder Location / Hierarchy
                </label>
                <select
                  value={newFolderParentFolder}
                  onChange={(e) => setNewFolderParentFolder(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--line)] text-[var(--text)] outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  <option value="">📁 Root Level (e.g. "Unit 1: Fundamentals")</option>
                  {availableParentFolders.map((p) => (
                    <option key={p} value={p}>
                      ↳ 📂 Nested under: "{p}"
                    </option>
                  ))}
                </select>
              </div>

              {/* Folder Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={
                    newFolderParentFolder
                      ? "e.g. Chapter 2: OSI Model, Pipelining, Cache Memory"
                      : "e.g. Unit 1: Fundamentals, Module A, Revision Notes"
                  }
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--input-bg)] border border-[var(--line)] text-[var(--text)] focus:border-[var(--accent)] outline-none transition-colors"
                />
              </div>

              {/* Live Breadcrumb Preview */}
              {newFolderName.trim() && (
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--line)] text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Path Preview:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] text-[var(--text)]">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                      {subjects.find((s) => s.id === newFolderTargetSubjectId)?.name || "Subject"}
                    </span>
                    <ChevronRight size={11} className="text-[var(--muted)]" />
                    {newFolderParentFolder && (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium">
                          {newFolderParentFolder}
                        </span>
                        <ChevronRight size={11} className="text-[var(--muted)]" />
                      </>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {newFolderName.trim()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="sa-btn-outline px-4 py-2 text-xs font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim() || !newFolderTargetSubjectId}
                  className="sa-btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  {isCreatingFolder ? <Loader2 size={13} className="animate-spin" /> : <FolderPlus size={13} />}
                  <span>Create Folder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


