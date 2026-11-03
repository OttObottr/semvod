# Search repair development regression

Planned comparison, not yet scored. This is development on previously inspected cases, not a fresh held-out accuracy result. Historical predictions and metrics remain unchanged in their original directories.

Changes under test: score the entire visual description rather than isolated keywords; reserve ambiguous small details for refinement; allocate visual refinement using visual evidence instead of chat-boosted scores. Both score cache namespaces change because instructions change; old paid caches are retained. Final hybrid ranking, thresholds, refinement count and the original interval adapter stay fixed.

The regression includes all six existing official QVHighlights queries and all six NASA development queries. The prior moderation block remains a miss without being retried. The unchanged Perception QA and comparison adapters will be regraded from saved receipts only. No unsupported claim about motion, audio, exact boundaries or competitive ranking follows from these checks.

Paid search checks share the prior $0.10 cumulative cap, including $0.0160496 already accounted for qvh-next. There are no automatic inference retries, model fallbacks, or ledger resets. A one-shot marker and persistent phase accounting prevent restarts from resetting the ceiling. Predictions must be committed before grading. No new dependencies or private footage are involved.
