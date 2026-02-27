---
trigger: always_on
---

# GEMINI.md - DreamSync Project Kit

> This file defines how the AI behaves in the DreamSync workspace.

---

## 📋 Project Overview
**DreamSync** is a mobile application built with **React Native (Expo)** using **TypeScript**.
Key features include:
- **Journeys**: Collaborative tasks/adventures user can join or own.
- **Worker/Contractor System**: Job management and reviews.
- **Chat**: Real-time communication (`app/chat`).
- **Tech Stack**: Expo Router, Firebase (implied by config), Tailwind CSS (likely NativeWind).

---

## CRITICAL: AGENT & SKILL PROTOCOL (START HERE)

> **MANDATORY:** You MUST read the appropriate agent file and its skills BEFORE performing any implementation. This is the highest priority rule.

### 1. Modular Skill Loading Protocol

Agent activated → Check frontmatter "skills:" → Read SKILL.md (INDEX) → Read specific sections.
- **Rule Priority:** P0 (GEMINI.md) > P1 (Agent .md) > P2 (SKILL.md).

### 2. Enforcement Protocol
1. **Activate**: Read Rules → Check Frontmatter → Load SKILL.md → Apply All.
2. **Forbidden**: Never skip reading agent rules or skill instructions.

---

## 📥 REQUEST CLASSIFIER

**Before ANY action, classify the request:**

| Request Type | Trigger Keywords | Active Tiers | Result |
| :--- | :--- | :--- | :--- |
| **QUESTION** | "what is", "explain" | TIER 0 only | Text Response |
| **SURVEY** | "analyze", "list files" | TIER 0 + Explorer | Session Intel |
| **CODE** | "fix", "add", "created" | TIER 0 + TIER 1 | **Code Edit** |
| **DESIGN** | "design", "UI", "screen"| TIER 0 + TIER 1 + Agent | **Structure Plan** |

---

## 🤖 INTELLIGENT AGENT ROUTING

**ALWAYS ACTIVE: Automatically analyze and select the best agent(s).**

> 🔴 **MANDATORY:** You MUST follow the protocol defined in `@[skills/intelligent-routing]`.

### Auto-Selection Protocol
1. **Analyze**: Detect domains (Mobile, Backend, etc.).
2. **Select Agent**: 
    - **Mobile/React Native**: `mobile-developer` (Primary)
    - **Backend/API**: `backend-specialist`
    - **General/Planning**: `project-planner`
3. **Inform User**: `🤖 Applying knowledge of @[agent-name]...`

---

## TIER 0: UNIVERSAL RULES (Always Active)

### 🧹 Clean Code (Global Mandatory)
**ALL code MUST follow `@[skills/clean-code]` rules.**
- **Concise**: No over-engineering.
- **Typed**: Strict TypeScript usage.
- **Documented**: Self-documenting code + necessary comments.

### 🗺️ System Map
- **App Entry**: `app/` (Expo Router).
- **Source**: `src/` (Components, Services).
- **Agents**: `.agent/` (Do not modify unless requested).
- **Config**: `.gemini/` (Artifacts).

---

## TIER 1: CODE RULES (When Writing Code)

### 📱 Mobile-First Strategy
**Primary Agent:** `mobile-developer`
- **Styling**: Tailwind CSS / NativeWind.
- **Navigation**: Expo Router (File-based).
- **Icons**: Lucide React Native (preferred) or Expo Vector Icons.

### 🛑 Socratic Gate
**For complex requests, STOP and ASK first:**
- **New Feature**: Ask 3 strategic questions (User? Goal? Edge cases?).
- **Bug Fix**: Confirm reproduction steps.

### 🏁 Final Checklist
**Trigger:** "final checks", "pre-commit".
Run: `python .agent/scripts/checklist.py .`

---

## TIER 2: SECURITY & STANDARDS

### 🛡️ Security Standards
**Agent**: `security-auditor`
- **Secrets**: No hardcoded keys. Use `.env`.
- **Validation**: Validate all inputs (Zod/Yup).
- **Firebase**: Check `firestore.rules` for every DB change.

### 🏗️ Project Structure Standards
- `app/`: Screens and Routing ONLY.
- `src/components/`: Reusable UI components.
- `src/hooks/`: Custom React hooks.
- `src/services/`: API and Firebase logic.
- `src/types/`: TypeScript definitions.

---

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimat Impact: Changes should only touch what's necessary. Avoid introducing bugs

## ⚡ QUICK REFERENCE

| Need | Agent | Skills |
| :--- | :--- | :--- |
| **New Screen** | `mobile-developer` | `mobile-design`, `react-best-practices` |
| **Fix Bug** | `debugger` | `systematic-debugging` |
| **Plan Feature**| `project-planner` | `plan-writing`, `brainstorming` |
| **API/DB** | `backend-specialist`| `api-patterns`, `database-design` |

> **Always read the corresponding `.agent/agents/[agent].md` file before starting work.**
