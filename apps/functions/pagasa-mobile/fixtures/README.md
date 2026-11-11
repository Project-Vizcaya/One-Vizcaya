# PAGASA mobile API fixtures

**These files are SYNTHETIC.** They were written by hand from the response
shapes described in the integration brief. They are not saved PAGASA
responses, and the build environment could not reach PAGASA's server to
check them.

Format: HTTP headers, a blank line, then the JSON body (the same format as
saved raw responses), so real captures can replace these files one for one.
`readFixture()` in `../pagasa-mobile.test.js` strips the headers.

**Before switching the PAGASA source on in production**, replace these with
real saved responses for `/nowcast/dashboard`, `/alerts` and
`/observation/automatic` and re-run `npm test`. If a test fails, the parser
needs adjusting to the real shape.
