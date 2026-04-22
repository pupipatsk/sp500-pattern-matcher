# Project Charter: sp500-pattern-matcher

### 1. Project Overview

- **Project Title:** S&P500 Pattern Matcher
- **Course Context:** 2110430 Time Series Data Mining – Final Project

### 2. Executive Summary

This project answers a single, high-value financial question: _"What is the S&P 500's current pattern like, and what happened next when this occurred in the past?"_ We will develop a locally hosted time-series engine that utilizes an NLP-driven semantic parser. The **Gemini API** will process a user's natural language input (e.g., _"Analyze the S&P 500 trend over the last 60 days"_) and extract the exact lookback window as a structured parameter.

The Python backend will then scan the S&P 500 index's entire history since inception to find the most mathematically similar periods using **Dynamic Time Warping (DTW)**, **Uniform Scaling**, and **LB_Keogh lower bounding** for computational efficiency. The final output is an insight-driven dashboard that calculates the average 1-month, 3-month, 6-month, and 1-year forward returns of those historical matches, providing empirical context for current market conditions.

### 3. Objectives & Success Criteria

- **Technical Correctness (20%):** Successfully implement Z-normalization, DTW, and Uniform Scaling locally to handle over 90 years of daily price data.
- **Course Concept Integration (20%):** Prove the computational necessity and speedup achieved by implementing LB_Keogh compared to brute-force DTW when scanning the entire S&P 500 history.
- **Analysis & Insight (20%):** Produce a comprehensive discussion evaluating the predictive value of the historical matches (analyzing the $T+1m, T+3m, T+6m, T+1y$ trajectories) and critically assessing whether historical similarity implies future performance.
- **Functional Deliverable:** A working `localhost` pipeline where Gemini acts as a one-shot NLP parser to trigger the local Python backend, returning a clean visualization of historical matches and future projections.

### 4. Project Scope

**In-Scope:**

- **Data Ingestion:** Historical daily financial data for the S&P 500 Index (`^GSPC`) spanning **since inception**, processed in main memory via Pandas/NumPy.
- **NLP Semantic Parsing:** The system handles one-shot natural language prompts.
- **Time-Series Engine:** Implementation of Subsequence Matching, Uniform Scaling (allowing historical matches to stretch or compress compared to the query), and LB_Keogh.
- **Forward-Looking Analytics:** Calculating and visualizing the subsequent 1m, 3m, 6m, and 1y returns of the top 5 closest historical DTW matches.

**Out-of-Scope (Descoped):**

- Conversational state, follow-up memory, or complex chat UI.
- Searching for synthetic or named patterns (e.g., Head & Shoulders).
- Cross-asset or multi-sector analysis.
- Cloud deployment, CI/CD pipelines, or managed database hosting.

### 5. Technical Stack Architecture

- **Frontend & UI:** Next.js running locally (`localhost:3000`) for a clean, single-page search interface and charting.
- **Backend Engine:** Python (FastAPI) running locally (`localhost:8000`) to execute the DTW distance matrix and forward-return calculations.
- **Database & Data Layer:** Local CSV files loaded directly into memory for maximum speed.
- **NLP Orchestrator:\*- **Gemini API\*\* strictly utilizing structured JSON output (`response_mime_type="application/json"`) to map user intent to backend parameters.

### 6. Key Risks & Mitigations

- **Risk:** Scanning nearly 100 years of daily S&P 500 data with Uniform Scaling causes local memory or CPU bottlenecks.
  - **Mitigation:** Ensure LB_Keogh is highly optimized (e.g., NumPy vectorization) to aggressively prune candidate sequences before executing the computationally heavy DTW step.
- **Risk:** The forward-looking return logic accidentally includes future data (look-ahead bias) during the similarity matching phase.
  - **Mitigation:** Strictly decouple the matching algorithm from the performance calculation. The DTW match must be calculated _only_ on the sequence ending at $T_0$, and the future returns calculated entirely independently.
