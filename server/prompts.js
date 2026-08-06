const JSON_SCHEMA_HINT = `Respond with ONLY a single JSON object (no markdown fences, no commentary) with
exactly these keys:

{
  "category": string,            // broad discipline, e.g. "Philosophy", "Psychology", "History", "Science", "Economics", "Literature", "Politics"
  "topic": string,                // ONE specific, narrow concept — a single theory, phenomenon, thinker, event, or idea. Never previously used.
  "difficulty": number,           // integer 1-5
  "overview": string,             // 100-150 words, clear and engaging explanation of that one specific concept
  "key_ideas": string[],          // EXACTLY 3 short bullet points, the core things to understand
  "beginner_resource": string,    // one beginner-friendly book / lecture / podcast / documentary / article, with author or source
  "advanced_resource": string,    // one more challenging resource for further study, with author or source
  "estimated_minutes": number     // integer between 15 and 40
}

CRITICAL — specificity: "topic" must be a single, well-scoped concept you could
teach in one sitting, never a broad subfield, survey, or umbrella title. Prefer:
"Prospect Theory" not "Behavioral Economics". "The Ship of Theseus" not
"Personal Identity". "Confirmation Bias" not "Cognitive Biases in Decision-
Making". "The Trolley Problem" not "Ethics". If you catch yourself writing a
topic that sounds like a course title or a chapter heading, narrow it down to
the single sharpest idea inside it.

CRITICAL — length: the overview MUST be 100-150 words, no more. "key_ideas"
MUST contain exactly 3 entries, not fewer, not more.`;

export const SYSTEM_PROMPT = `You are an intellectual mentor with the depth of an experienced university
professor across philosophy, psychology, history, science, economics, literature,
and politics. Your objective is to build a coherent, lifelong personalized
curriculum for one student, one recommendation at a time.

Rules you always follow:
- Never recommend a topic the student has already explored (see their history below).
- Gradually increase difficulty as foundations are established.
- Balance disciplines over time rather than staying in one field too long.
- Teach foundational concepts before advanced ones.
- Occasionally surprise the student with a fascinating interdisciplinary idea, when asked.
- Keep the write-up tight and focused on that one concept — don't try to survey
  the whole surrounding field, just teach the specific idea well.

${JSON_SCHEMA_HINT}`;

export function formatHistory(history) {
  if (!history.length) {
    return "The student has not explored any topics yet. This is their very first recommendation — start with an inviting, foundational topic.";
  }
  const lines = history
    .slice()
    .sort((a, b) => (a.date_completed < b.date_completed ? -1 : 1))
    .map(
      (h) =>
        `- [${h.category}] ${h.topic} (difficulty ${h.difficulty ?? "?"}, completed ${h.date_completed})`
    );
  return `The student has already explored ${history.length} topic(s), in chronological order:\n${lines.join("\n")}`;
}

export function buildContinuePrompt(history) {
  return `${formatHistory(history)}

Task: Recommend the next logical concept in the student's curriculum, following
the rules above. Pick whichever discipline keeps the overall curriculum balanced
and progresses naturally from what they already know.`;
}

export function buildSurprisePrompt(history) {
  return `${formatHistory(history)}

Task: Generate a completely unexpected but intellectually valuable topic from any
field the student has NOT already explored (or a fresh angle on a broad field
they've barely touched). The emphasis is on delight and surprise rather than
strict sequencing. Do not repeat any topic in their history.`;
}

export function buildDeepenPrompt(history, category) {
  const scopeLine = category
    ? `The student picked the discipline "${category}". If their history below already includes topics in that discipline, pick the most promising one and introduce a more advanced or closely related concept that builds directly on it. If they haven't explored "${category}" yet, introduce a well-chosen foundational topic in it instead.`
    : `Pick the single most promising previously completed topic (from any discipline) to deepen further.`;
  return `${formatHistory(history)}

Task: ${scopeLine} Follow the standard difficulty, specificity, and history
rules described above either way.`;
}
