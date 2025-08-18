# Orchestration Layer Blueprint for AI Assistant System
# Purpose: Local, privacy-first orchestration of AI tasks, tools, and APIs
# Scope: Handles AI flow, decision logic, task execution, and response lifecycle

============================================================
1. Event Ingestion Layer
============================================================

- Purpose: Capture, parse, and forward triggers from user, system, or external APIs.
- Examples: New email received, user clicked button, timer hit, file modified.
- Input Methods:
  - HTTP API endpoints (e.g., POST /trigger/email)
  - WebSocket (for real-time system monitoring)
  - File Watchers (Node.js fs.watch or chokidar)
- Output: Pushed into Task Queue or directly into Decision Engine

Tools:
  - Node.js Express (for REST API)
  - EventEmitter for internal signals
  - Optionally: RabbitMQ or Redis Pub/Sub (if you go multi-process later)

============================================================
2. Task Scheduler / Queue Manager
============================================================

- Purpose: Manage task concurrency, rate limits, retries, and prioritization
- Acts like the "OS kernel" for AI tasks

Responsibilities:
  - Receive structured task object
  - Schedule or run immediately (based on rules)
  - Retry failed tasks
  - Timeout/cancel slow-running tasks

Tools:
  - `bullmq` or `agenda.js` for task queueing (local Redis)
  - Fallback: custom in-memory JS queue if Redis is overkill
  - JSON schema for standard task format

============================================================
3. AI Orchestrator
============================================================

- Purpose: Interface to run local LLMs or Groq/OpenRouter models with:
    - Prompt management
    - Context injection
    - Response post-processing

Subcomponents:
  - Model Selector: Choose fastest or most suitable model
  - Prompt Builder: Based on task type and current context
  - Context Engine: Pull from ChromaDB, Redis, or file-based memory
  - Output Parser: Clean, extract or structure model output

Tools:
  - Ollama / LM Studio (Local LLMs)
  - ChromaDB (Context retrieval)
  - Prompt templates stored in `/prompts/`

============================================================
4. Decision Engine
============================================================

- Purpose: Classify intent, route to appropriate agent or tool

Examples:
  - "Sort this email" → Classify as `email_tool`
  - "Summarize calendar week" → `planner_tool`

Implementation:
  - Rule-based + lightweight classifier (model like TinyLM or fine-tuned MiniLM)
  - Multi-label classification, fallback to AI Orchestrator if unsure
  - Optional: confidence score threshold for automation vs. fallback

Tools:
  - ONNX runtime for super light classifiers
  - Alternatively: heuristic/rule-first, then model if needed

============================================================
5. Action Execution Engine
============================================================

- Purpose: Actually perform the final task (call Gmail API, file system, etc.)

Responsibilities:
  - Translate structured task into real-world action
  - Handle side-effects and confirmations
  - Return success/failure back to Orchestrator

Examples:
  - `sendEmail(payload)`
  - `deleteFile(path)`
  - `writeNoteToNotion()`

Tech:
  - Native Node.js functions + modular services (e.g., `services/email.service.ts`)
  - Use retry/wrapping logic here too

============================================================
6. Mild User Auth / Token Passing
============================================================

- Purpose: Allow secure delegation of tasks per user or system

Responsibilities:
  - Manage tokens securely (access, refresh)
  - Attach tokens to downstream APIs (like Gmail)
  - Expire/renew as needed

Tools:
  - Cookie-based storage (secure flag, httpOnly)
  - Optional: JWT for internal service handoffs
  - Token storage: In-memory or encrypted file (no DB needed if single-user)

============================================================
7. System Management
============================================================

- Purpose: Monitor and debug Orchestration Layer status

Responsibilities:
  - Show currently running tasks
  - Expose logs/errors per component
  - Enable manual rerun, cancel, inspect queue

Tools:
  - CLI dashboard (Node.js readline + terminal-kit / blessed)
  - REST or WebSocket server for GUI-based monitoring (future)
  - Logging via `winston` or simple rotating log files

============================================================

# Development Plan
- [ ] Set up basic Express server + EventEmitter
- [ ] Build minimal in-memory Task Queue
- [ ] Write modular AI runner (Ollama wrapper or Groq API)
- [ ] Add prompt templates + context manager
- [ ] Create dummy Decision Engine with simple if-else logic
- [ ] Implement Gmail Action Executor
- [ ] Test full pipeline: trigger → classify → prompt → AI → Gmail

# Notes
- Everything runs locally
- No 3rd-party cloud usage
- Keep all data private, log selectively

# End of Plan
