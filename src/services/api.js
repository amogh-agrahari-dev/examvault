export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://examvault-utc3.onrender.com/api/v1";

// Client-side in-memory cache and concurrent in-flight deduplication
const clientCache = new Map();
const inFlightRequests = new Map();

export function clearClientCache(prefix = null) {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.includes(prefix)) clientCache.delete(key);
  }
}

export async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const cacheTtlMs = options.cacheTtlMs ?? (isGet ? 20000 : 0);

  const authHeader = options.headers?.Authorization || "";
  const cacheKey = `${method}:${path}:${authHeader}`;

  // On write / mutation, invalidate relevant client cache keys
  if (!isGet) {
    if (path.startsWith("/notes")) clearClientCache("/notes");
    else if (path.startsWith("/documents")) clearClientCache("/documents");
    else if (path.startsWith("/quiz")) clearClientCache("/quiz");
    else if (path.startsWith("/summary")) clearClientCache("/summary");
    else if (path.startsWith("/past-papers")) clearClientCache("/past-papers");
  }

  // Fast path: serve cached GET requests instantly (0ms)
  if (isGet && cacheTtlMs > 0 && !options.noCache) {
    const entry = clientCache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
  }

  // Request deduplication: merge duplicate concurrent in-flight GET requests
  if (isGet && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        let message = "Something went wrong. Please try again.";
        try {
          const payload = await response.json();
          if (typeof payload.detail === "string") message = payload.detail;
          else if (Array.isArray(payload.detail)) message = payload.detail.map((item) => item.msg).join(" ");
          else if (typeof payload.message === "string") message = payload.message;
        } catch {}
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();

      if (isGet && cacheTtlMs > 0) {
        clientCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + cacheTtlMs,
        });
      }

      return data;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export function registerUser({ email, full_name, password }) {
  clearClientCache("/auth");
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, full_name, password }),
  });
}

export function loginUser({ email, password }) {
  clearClientCache();
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(accessToken) {
  return request("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cacheTtlMs: 60000, // Cache for 60s
  });
}

export function uploadStudyDocument(file, accessToken, params = null) {
  const formData = new FormData();
  formData.append("file", file);
  
  if (params) {
    if (params.subject_id) formData.append("subject_id", params.subject_id);
    if (params.type) formData.append("document_type", params.type);
    if (params.year) formData.append("year", params.year);
  }

  return fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Upload failed");
    }
    clearClientCache("/documents");
    return res.json();
  });
}

export function getDocuments(accessToken) {
  return request("/documents/", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getDocument(documentId, accessToken) {
  return request(`/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function deleteDocument(documentId, accessToken) {
  return request(`/documents/${documentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((res) => {
    clearClientCache("/documents");
    return res;
  });
}

export function reprocessDocument(documentId, accessToken) {
  return request(`/documents/${documentId}/reprocess`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((res) => {
    clearClientCache("/documents");
    return res;
  });
}

export function getDocumentTopics(documentId, accessToken) {
  return request(`/documents/${documentId}/topics`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getTopicFlashcards(topicId, accessToken) {
  return request(`/documents/topics/${topicId}/flashcards`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getActiveStudyPlan(accessToken) {
  return request("/planner/current", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function generateStudyPlan(payload, accessToken) {
  return request("/planner/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function toggleStudyTask(taskId, accessToken) {
  return request(`/planner/tasks/${taskId}/toggle`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function rebalanceStudyPlan(accessToken) {
  return request("/planner/rebalance", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function addStudyTask(payload, accessToken) {
  return request("/planner/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

// Quiz endpoints
export function getQuizConfig(accessToken) {
  return request("/quiz/config", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getQuizzes(accessToken) {
  return request("/quiz", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getQuiz(quizId, accessToken) {
  return request(`/quiz/${quizId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function deleteQuiz(quizId, accessToken) {
  return request(`/quiz/${quizId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function generateQuiz(payload, accessToken) {
  return request("/quiz/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function startQuizAttempt(quizId, accessToken) {
  return request(`/quiz/${quizId}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function saveQuizAnswer(attemptId, questionId, payload, accessToken) {
  return request(`/quiz/attempts/${attemptId}/answers/${questionId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function submitQuizAttempt(attemptId, accessToken) {
  return request(`/quiz/attempts/${attemptId}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getQuizAttemptResult(attemptId, accessToken) {
  return request(`/quiz/attempts/${attemptId}/result`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Summary endpoints
export function discoverSummaryTopics(payload, accessToken) {
  return request("/summary/discover", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function generateSummaryJob(jobId, payload, accessToken) {
  return request(`/summary/jobs/${jobId}/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function getSummaryJobStatus(jobId, accessToken) {
  return request(`/summary/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getSummaries(accessToken) {
  return request("/summary/", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getSummary(summaryId, accessToken) {
  return request(`/summary/${summaryId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ── Topic-Grounded Chat endpoints ──────────────────────────────────────────

/** Returns all user's documents with their topics for the topic selector. */
export function getChatTopics(accessToken) {
  return request("/chat/topics", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Get or create a persistent chat session for a specific topic. */
export function getOrCreateChatSession(topicId, accessToken) {
  return request("/chat/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ topic_id: topicId }),
  });
}

/** Retrieve an existing session and its full message history. */
export function getChatSession(sessionId, accessToken) {
  return request(`/chat/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Send a question through the RAG pipeline and receive a grounded answer. */
export function askChatQuestion(sessionId, question, accessToken) {
  return request(`/chat/sessions/${sessionId}/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ question }),
  });
}

/** Clear all messages in a chat session (keeps the session). */
export function clearChatHistory(sessionId, accessToken) {
  return request(`/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Backfill document chunks for an existing document (for pre-chat documents). */
export function backfillDocumentChunks(documentId, accessToken) {
  return request(`/documents/${documentId}/backfill-chunks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Discussions (Study Rooms)
// ─────────────────────────────────────────────────────────────────────────────

export function getTopicDiscussions(topicId, accessToken) {
  return request(`/discussions/topic/${topicId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getAllDiscussions(accessToken) {
  return request(`/discussions/all`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createDiscussion(data, accessToken) {
  return request(`/discussions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function joinDiscussion(discussionId, accessToken) {
  return request(`/discussions/${discussionId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function requestJoinDiscussion(discussionId, accessToken) {
  return request(`/discussions/${discussionId}/request`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getDiscussionRequests(discussionId, accessToken) {
  return request(`/discussions/${discussionId}/requests`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

export function approveDiscussionRequest(discussionId, requestId, accessToken) {
  return request(`/discussions/${discussionId}/requests/${requestId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function rejectDiscussionRequest(discussionId, requestId, accessToken) {
  return request(`/discussions/${discussionId}/requests/${requestId}/reject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getDiscussionMessages(discussionId, accessToken) {
  return request(`/discussions/${discussionId}/messages`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

export function getDiscussionMembers(discussionId, accessToken) {
  return request(`/discussions/${discussionId}/members`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

export function sendDiscussionMessage(discussionId, content, accessToken, clientMsgId = null) {
  return request(`/discussions/${discussionId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ content, client_msg_id: clientMsgId }),
  });
}

export function verifyDiscussionClaim(discussionId, claim, accessToken, messageId = null) {
  return request(`/discussions/${discussionId}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ claim, message_id: messageId }),
  });
}

export function askAIDiscussion(discussionId, question, accessToken) {
  return request(`/discussions/${discussionId}/ask-ai`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ question }),
  });
}

// ==========================================
// Quick Short Notes API
// ==========================================

export function getNotes(accessToken, { search, subject_id, topic_id } = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (subject_id) params.append("subject_id", subject_id);
  if (topic_id) params.append("topic_id", topic_id);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request(`/notes${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getNote(noteId, accessToken) {
  return request(`/notes/${noteId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createNote(noteData, accessToken) {
  return request("/notes", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(noteData),
  });
}

export function updateNote(noteId, noteData, accessToken) {
  return request(`/notes/${noteId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(noteData),
  });
}

export function renameNote(noteId, title, accessToken) {
  return request(`/notes/${noteId}/rename`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ title }),
  });
}

export function deleteNote(noteId, accessToken) {
  return request(`/notes/${noteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getAvailableNoteTopics(accessToken, subjectId = null) {
  const qs = subjectId ? `?subject_id=${subjectId}` : "";
  return request(`/notes/topics${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function createSubject(data, accessToken) {
  return request("/subjects", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}

export function createNoteTopic(data, accessToken) {
  return request("/notes/topics", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
}


export async function uploadNoteImage(file, accessToken, noteId = null) {
  const formData = new FormData();
  formData.append("file", file);
  const qs = noteId ? `?note_id=${noteId}` : "";
  const response = await fetch(`${API_BASE_URL}/notes/upload-image${qs}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = "Image upload failed";
    try {
      const err = await response.json();
      if (err.detail) message = err.detail;
    } catch {
      // keep fallback
    }
    throw new Error(message);
  }
  clearClientCache("/notes");
  return response.json();
}

export function getNoteImageUrl(imageRelativeUrl, accessToken) {
  if (!imageRelativeUrl || typeof imageRelativeUrl !== "string") return "";

  const trimmed = imageRelativeUrl.trim();

  // 1. Inline SVG string: convert to safe data URI so browser doesn't send HTTP GET
  if (trimmed.startsWith("<svg") || trimmed.includes("</svg>")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }

  // 2. Data URI: return directly
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  // 3. Strip any stale or expired token query parameter (?token=... or &token=...)
  let cleanUrl = trimmed;
  const tokenQueryIndex = cleanUrl.indexOf("?token=");
  const altTokenIndex = cleanUrl.indexOf("&token=");
  if (tokenQueryIndex !== -1) {
    cleanUrl = cleanUrl.substring(0, tokenQueryIndex);
  } else if (altTokenIndex !== -1) {
    cleanUrl = cleanUrl.substring(0, altTokenIndex);
  }

  // 4. External URL (not our API): return as-is
  if ((cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) && !cleanUrl.includes("/notes/images/")) {
    return cleanUrl;
  }

  // 5. If it's a full URL to our note images, extract pathname
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    try {
      const parsed = new URL(cleanUrl);
      cleanUrl = parsed.pathname;
    } catch {
      // ignore
    }
  }

  const cleanPath = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
  const baseUrlWithoutApi = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  const full = `${baseUrlWithoutApi}${cleanPath}`;
  return accessToken ? `${full}?token=${encodeURIComponent(accessToken)}` : full;
}

export function generateAiFlowchart(prompt, accessToken, model = null) {
  return request("/notes/ai/flowchart", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify({ prompt, model }),
  });
}

export function simulateCode(code, language = "python", stdin = "", accessToken = null, model = null) {
  return request("/notes/ai/simulate-code", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify({ code, language, stdin, model }),
  });
}

export function getUserProfile(userId, accessToken) {
  return request(`/users/${encodeURIComponent(userId)}/profile`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cacheTtlMs: 30000,
  });
}

export function getLeaderboard(accessToken, limit = 20) {
  return request(`/users/leaderboard?limit=${limit}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cacheTtlMs: 15000,
  });
}

export function globalSearch(query, accessToken) {
  return request(`/users/search/global?q=${encodeURIComponent(query)}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cacheTtlMs: 5000,
  });
}

// -------------------------------------------------------------
// Dedicated Past Papers & Independent Paper Prediction Filebase
// -------------------------------------------------------------
export function uploadPastPaper(file, accessToken, { subject_id, year, exam_type } = {}) {
  const formData = new FormData();
  formData.append("file", file);
  if (subject_id) formData.append("subject_id", subject_id);
  if (year) formData.append("year", year);
  if (exam_type) formData.append("exam_type", exam_type);

  return fetch(`${API_BASE_URL}/past-papers/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      let msg = "Failed to upload past paper";
      try {
        const errJson = await res.json();
        msg = errJson.detail || msg;
      } catch {}
      throw new Error(msg);
    }
    clearClientCache("/past-papers");
    return res.json();
  });
}

export function getPastPapers(accessToken, subjectId = null) {
  const q = subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : "";
  return request(`/past-papers/${q}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

export function getPastPaper(paperId, accessToken) {
  return request(`/past-papers/${paperId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

export function deletePastPaper(paperId, accessToken) {
  return request(`/past-papers/${paperId}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }).then((res) => {
    clearClientCache("/past-papers");
    return res;
  });
}

export function predictPaperFromPastPaper(paperId, accessToken, config = {}) {
  return request(`/past-papers/${paperId}/predict`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify(config),
  }).then((res) => {
    clearClientCache("/past-papers");
    return res;
  });
}

export function getPredictedPapers(accessToken, params = {}) {
  const queryParts = [];
  if (params.subject_id) queryParts.push(`subject_id=${encodeURIComponent(params.subject_id)}`);
  if (params.past_paper_id) queryParts.push(`past_paper_id=${encodeURIComponent(params.past_paper_id)}`);
  const q = queryParts.length ? `?${queryParts.join("&")}` : "";

  return request(`/past-papers/predicted/list${q}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

export function getPredictedPaper(predictedId, accessToken) {
  return request(`/past-papers/predicted/${predictedId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

export function deletePredictedPaper(predictedId, accessToken) {
  return request(`/past-papers/predicted/${predictedId}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }).then((res) => {
    clearClientCache("/past-papers");
    return res;
  });
}

export function importPastPaperFromDocument(documentId, accessToken, options = {}) {
  return request("/past-papers/import-from-document", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify({
      document_id: documentId,
      year: options.year,
      exam_type: options.exam_type || "End-Sem",
    }),
  }).then((res) => {
    clearClientCache("/past-papers");
    return res;
  });
}


