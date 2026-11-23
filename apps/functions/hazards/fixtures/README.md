# Hazard feed fixtures

**SYNTHETIC.** These files were written by hand from the documented formats.
The USGS FDSN GeoJSON format is public. The PHIVOLCS table layout was written
from its public earthquake-information page as known, NOT from a saved copy.
The build environment could not reach either site.

Format: HTTP headers, a blank line, then the body.

**Before relying on PHIVOLCS** (and before switching `phivolcsEnabled` on),
save a real copy of the page into `phivolcs.txt` and run `npm test` in
`apps/functions`. If a test fails, the parser needs adjusting.
