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

## ⚡ QUICK REFERENCE

| Need | Agent | Skills |
| :--- | :--- | :--- |
| **New Screen** | `mobile-developer` | `mobile-design`, `react-best-practices` |
| **Fix Bug** | `debugger` | `systematic-debugging` |
| **Plan Feature**| `project-planner` | `plan-writing`, `brainstorming` |
| **API/DB** | `backend-specialist`| `api-patterns`, `database-design` |

> **Always read the corresponding `.agent/agents/[agent].md` file before starting work.**
