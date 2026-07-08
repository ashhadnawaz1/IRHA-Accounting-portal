IRHA Accounting Portal — Add Client Flow
A front-end recreation of a real client-onboarding workflow, built with plain HTML, CSS and JavaScript (no build tools, no frameworks — easy to read, easy to demo).
What's implemented
Step 1 — KYC Form (Create Customer)
Full form: name, business, email, phone, address, tax ID, multi-select services
Client-side validation, including a required-service check
On submit, generates a sequential CUST-0001 style ID, stamped into a live "Case File" panel
Step 2 — Add Client (Create Case)
Identity/contact fields are auto-filled from Step 1 and shown locked (read-only, with a lock indicator) — matching "pick the CUST ID, auto-fill and lock"
Services can be re-confirmed
Three package tiers (Basic / Standard / Premium) as selectable cards
Payment mode selector with a live-calculated summary (package + per-service add-ons + 18% GST)
Submitting creates the case and advances the stepper — no Client ID is issued yet, matching the source workflow
Step 3 — Quotation → Invoice → Receipt → Compliance (popup)
One modal with an internal 4-tab progression, exactly as the source flow describes ("inside a popup")
Quotation and Invoice pull live numbers from the package/services chosen in Step 2
Receipt requires a "payment received" confirmation before continuing
Compliance requires four checks before it will approve — this is the only place a Client ID can be generated
Step 4 — Client ID Created
Only reachable after Compliance approves, matching "Client ID (CLT) is NOT generated at Add Client — it comes only after the full flow"
Issues a sequential CLT-0001 style ID, stamped into the Case File panel
"Start a new client" resets the whole flow with incremented Customer/Client sequence numbers
Design notes
Palette: deep ink navy with an emerald accent (compliance/success) and a muted gold accent (verification/locked data) — a ledger/dossier identity rather than a generic dashboard look.
Typography: Space Grotesk for headings, Inter for body copy, IBM Plex Mono for IDs and figures (CUST-0001, ₹ totals) — mirrors how real IDs and amounts are set in accounting software.
Signature element: the Case File panel on the right is a live dossier — it fills in as you type, and each generated ID "stamps" in with a short animation, framing the ID-generation logic (front and center in the source workflow) as the memorable moment of the UI.
Run it
Just open index.html in a browser — no server or dependencies required.
Files
Code
Possible next steps
Persist state (localStorage or a backend) so cases survive a refresh
Support multiple customers/cases in progress at once, with a list/search view
PDF export for the generated quotation, invoice and receipt