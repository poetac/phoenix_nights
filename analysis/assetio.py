#!/usr/bin/env python3
"""Shared committed-JSON write helper.

Every builder ends with the same pattern: OUT.write_text(json.dumps(payload,
indent=1, allow_nan=False)). Centralized so indent/allow_nan can never drift
between builders — allow_nan=False is load-bearing (see verify_v0.py's
_first_nonfinite commit gate: a committed NaN/Infinity crashes the browser's
JSON.parse). This is a thin pass-through, not a dict-merging stamp helper —
callers build their own ordered dict (generated/throughYear/...), so a commit
diff stays exactly the byte-for-byte change it looks like.

Stdlib only.
"""

import json


def write_json(path, payload):
    """Write payload as indented JSON to path, creating parent dirs if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=1, allow_nan=False))
