# Project Charter: sp500-pattern-matcher

### 1. Project Overview

- **Project Title:** S&P500 Pattern Matcher
- **Course Context:** 2110430 Time Series Data Mining – Final Project

### 2. Executive Summary

This project answers a single, high-value time-series question: _"Given a recent market window, where in history did the S&P 500 move most similarly—and what happened next?"_

We build a fully local pipeline where a lightweight NLP parser (regex first, optionally **Gemini** with structured JSON output) converts a user's natural-language prompt into a concrete \([start, end]\) date window. The Python backend then scans the S&P 500 index history and finds the **single closest non-overlapping historical window** using:

- **Z-normalization** (shape comparison, not level comparison)
- **LB_Keogh lower bounding** (fast pruning)
- **Sakoe–Chiba band–constrained DTW with early abandon** (numba-accelerated, squared distance)

The final deliverable is a localhost dashboard that visualizes the query vs. best match, and reports forward returns from the match window at multiple horizons (1m → 3y) to provide empirical context for the current pattern.

### 3. Objectives & Success Criteria

- **Technical Correctness (20%):** Correctly implement and use **Z-normalization**, **LB_Keogh**, and **constrained DTW** to match subsequences across ~100 years of daily S&P 500 prices.
- **Course Concept Integration (20%):** Demonstrate why **lower bounding + pruning** (LB_Keogh) is computationally necessary when scanning long histories, compared to brute-force DTW on every candidate window.
- **Analysis & Insight (20%):** Evaluate the predictive value (and limits) of historical similarity by inspecting forward performance at $T+1m, T+3m, T+6m, T+9m, T+1y, T+2y, T+3y$, and discussing whether “similar past” implies “similar future.”
- **Functional Deliverable:** A working `localhost` system where a user prompt triggers an end-to-end run and returns a clean visualization plus forward-return summary for the best historical match.

### 4. Project Scope

**In-Scope:**

- **Data Ingestion:** Daily S&P 500 Index (`^GSPC`) history (via `yfinance`, cached to local CSV), processed in memory with Pandas/NumPy.
- **Prompt → Date Window Parsing:** One-shot natural-language prompts parsed into \([start, end]\) dates (regex fast-path; optional Gemini structured JSON).
- **Time-Series Matching Engine (v1):**
  - Subsequence matching over all valid candidate windows of length \(n = |\text{query}|\)
  - Z-normalization of query and candidate windows
  - **LB_Keogh** envelope computation on the query and lower-bound pruning for candidates
  - **Constrained DTW** using a Sakoe–Chiba band with \(r = \max(5, \lfloor 0.05n \rfloor)\) and early abandon using the current best distance
  - **Non-overlap constraint:** matched windows (including their forward tails) cannot overlap the query range to avoid leakage
- **Forward-Looking Analytics (v1):** For the best match, compute and display forward returns at approximately 1m/3m/6m/9m/1y/2y/3y (21/63/126/189/252/504/756 trading days).

**Out-of-Scope (Descoped):**

- Conversational state, follow-up memory, or complex chat UI.
- Searching for synthetic or named patterns (e.g., Head & Shoulders).
- Cross-asset or multi-sector analysis.
- Cloud deployment, CI/CD pipelines, or managed database hosting.
- **Uniform Scaling / time-axis rescaling** (stretching/compressing candidates) in v1.
- **Top-k match ranking** and aggregate statistics (v1 returns the single best match for simplicity).

### 5. Technical Stack Architecture

- **Frontend & UI:** Next.js running locally (`localhost:3000`) for a clean, single-page search interface and charting.
- **Backend Engine:** Python (FastAPI) running locally (`localhost:8000`) to execute the DTW distance matrix and forward-return calculations.
- **Database & Data Layer:** Local CSV cache (`backend/data/sp500.csv`) loaded into memory; sourced from `yfinance` (`^GSPC`, `period="max"`).
- **NLP Orchestrator:** Regex parsing for prompts like “last 180 days”; otherwise **Gemini API** with structured JSON output (`response_mime_type="application/json"`, `response_schema=QueryRange`) to map user intent to backend parameters.

### 6. Key Risks & Mitigations

- **Risk:** Brute-force DTW across nearly 100 years of daily data is too slow (DTW is expensive; scanning many candidate windows compounds cost).
  - **Mitigation:** Use (1) **LB_Keogh** lower bounds to prune most candidates in \(O(n)\), (2) **Sakoe–Chiba band constraint** to reduce DTW to roughly \(O(nr)\), and (3) **early abandon** using the current best-so-far distance; accelerate kernels with **numba**.
- **Risk:** The forward-looking return logic accidentally includes future data (look-ahead bias) during the similarity matching phase.
  - **Mitigation:** Strictly decouple the matching algorithm from the performance calculation. The DTW match must be calculated _only_ on the sequence ending at $T_0$, and the future returns calculated entirely independently.
