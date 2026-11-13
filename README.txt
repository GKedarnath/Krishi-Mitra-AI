# Krishi Mitra AI — integrated local website

## Files
- `Krishi_Mitra_AI.html` — website UI, connected to the backend APIs.
- `krishi_mitra_server.js` — JavaScript backend using Node.js built-in modules only.

## Run
1. Install Node.js (LTS) if it is not already installed.
2. Put both files in the same folder.
3. Open a terminal in that folder and run: `node krishi_mitra_server.js`
4. Open `http://127.0.0.1:3000` in your browser.
5. Check `http://127.0.0.1:3000/health` to see whether the backend is running.

## What is connected
- Analyze message -> `POST /api/assist`
- Upload plain-text knowledge file -> `POST /api/knowledge/upload`
- Knowledge status -> `GET /api/knowledge/status`
- GPS registration -> `POST /api/gps`
- Photo metadata registration -> `POST /api/geo-photos`
- Human review queue -> `POST /api/human-review`
- Local tool registry -> `POST /api/tools/call`

## Important limitations
- No Ollama, Python, npm packages, external AI API or internet service is used.
- The backend does not contain an LLM. `/api/assist` uses keyword-overlap retrieval against text documents uploaded by the user. It is not unrestricted natural-language understanding or a full agentic AI.
- Only `.txt` knowledge files are indexed. The backend does not validate whether a document is official, current, or applicable.
- Photo files are not uploaded. Only filename, MIME type, size and optional current GPS coordinates are registered.
- GPS capture is subject to browser permission and usually requires localhost or HTTPS. GPS does not prove where/when a photo was taken or establish crop loss.
- Human review requests are stored in memory locally; no reviewer is notified.
- Knowledge, GPS, photo metadata, review requests and audit logs are lost when the server restarts.
- No official PMFBY, insurer, land-record or weather API is connected. This prototype does not file, assess or approve claims.

Do not upload Aadhaar numbers, bank details, OTPs, passwords or other sensitive information.


## Official PMFBY references added in this update
- The website now links directly to official PMFBY Farmer Login, Application Status, insurer directory, and PMFBY portal.
- Official helpline references shown: 14447 and WhatsApp chatbot number 7065514447 (confirm current details on the official portal).
- `knowledge/pmfby_official_reference.txt` is automatically loaded into local retrieval at startup. It includes source URLs, a dated Ministry/PIB update (2 Dec 2025), and a clearly-labelled 2023 Operational Guidelines reference.
- `GET /api/official-services` lists the official public links.
- `GET /api/integrations/status` reports which official links exist and whether a private API is actually configured.

## What is still not a live government integration
No direct NCIP claim-status, policy, farmer enrolment, grievance-submission, insurer or land-record API is enabled. The public API Setu PMFBY collection page was found, but its visible listing describes a Policy Document collection and the API definition did not load. The project therefore does not guess API URLs or bypass login, OTP or CAPTCHA.
To implement authenticated transactions, obtain written authorization, the current API specification, approved scopes, test credentials and production credentials from the relevant portal/authority or insurer. Do not place API secrets in frontend HTML or share farmer OTP/Aadhaar/bank data in this prototype.
