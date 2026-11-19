---
"@unicep/core": minor
---

Add `circuitBreaker.lastResort`: when a lookup fails, still try the providers skipped because their circuit is open (in priority order); a success closes that circuit.
