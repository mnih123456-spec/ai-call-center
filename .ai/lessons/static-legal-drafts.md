---
title: "Static legal drafts retain explicit unknowns"
modules: ["platform"]
areas: ["backend-ui"]
topics: ["static-html", "legal-drafts"]
---

# Static legal drafts retain explicit unknowns

**Context**: The static `strona/` site needs Polish legal drafts sharing its header, footer and stylesheet.

**Problem**: Missing provider details and commercial terms cannot be inferred from product copy. Static pages and the calling platform have different data flows.

**Rule**: Keep the legal-review warning and visible placeholders, separate site and platform processing, and preserve cross-page navigation. Write UTF-8 explicitly when piping Polish text through PowerShell to a process.

**Applies to**: `strona/` legal documents.
