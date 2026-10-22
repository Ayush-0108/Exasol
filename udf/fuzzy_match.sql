-- Reference UDF for in-database fuzzy matching.
-- Requires the Python 3 script language container to be installed in Exasol.
-- See README.md "Exasol Python UDF Setup" section for BucketFS installation steps.
-- The application currently runs fuzzy matching in Python (main.py) as a fallback.
-- In production with the lang container installed, this UDF would push the
-- computation into Exasol's MPP cluster for horizontal scale.

--/
CREATE OR REPLACE PYTHON3 SCALAR SCRIPT fuzzy_match(str1 VARCHAR(2000), str2 VARCHAR(2000)) RETURNS DOUBLE AS
import difflib

def run(ctx):
    val1 = ctx.str1
    val2 = ctx.str2
    
    # Handle NULL or missing values gracefully
    if val1 is None or val2 is None:
        return 0.0
    
    # Normalize by trimming and lowering case
    s1 = str(val1).strip().lower()
    s2 = str(val2).strip().lower()
    
    if not s1 or not s2:
        return 0.0
        
    return float(difflib.SequenceMatcher(None, s1, s2).ratio())
/
