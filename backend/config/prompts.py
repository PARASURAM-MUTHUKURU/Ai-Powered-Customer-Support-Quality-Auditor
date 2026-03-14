"""
Centralized storage for all AI prompts and large text instructions used across the backend.
"""

# Prompt for the Audit endpoint
AUDIT_PROMPT_TEMPLATE = """
Analyze the following customer support {transcript_type} transcript and provide a quality audit.

Metrics to score (0-100):
1. Empathy: How well did the agent understand and validate the customer's feelings?
2. Resolution: Did the agent solve the problem or provide a clear path forward?
3. Compliance: Did the agent follow standard protocols (greeting, privacy check, closing)?

Identify specific compliance violations. For each violation, specify:
- type: A short name for the violation
- description: A detailed explanation
- severity: 'Critical', 'Warning', or 'Info'
- transcript_line_index: The 0-based index of the line in the transcript where this violation occurred or is most relevant.

Transcript:
\"\"\"
{transcript}
\"\"\"

Return the result as a raw JSON object with the following keys:
empathy_score, resolution_score, compliance_score, overall_score, violations (list of objects with keys type, description, severity, transcript_line_index), suggestions.
"""

# Prompt for the Transcription / Diarization endpoint
TRANSCRIBE_DIARIZATION_PROMPT = """Transcribe this customer support call audio accurately. 

TASK: Perform ADVANCED SPEAKER DIARIZATION. 
Analyze the acoustic subpopulations and vocal signatures to distinguish speakers.

FORMAT: Each line MUST follow this EXACT format:
[MM:SS] Speaker Name (Confidence%): Message

EXAMPLES:
[00:05] Agent (98%): Thank you for calling tech support.
[00:12] Customer (85%): My internet is down again.

HEURISTICS for identification:
- "Agent": Look for standard greetings, professional tone, and process-oriented speech.
- "Customer": Look for the person stating the problem or providing details.
- "Speaker X": For any additional speakers who are not the primary Agent or Customer, label them as "Speaker 3", "Speaker 4", etc.
- If names are explicitly mentioned, use them (e.g., "John", "Sarah") instead of generic roles.

CRITICAL:
1. Ensure timestamps are accurate.
2. Provide a confidence percentage for each attribution based on the clarity of the vocal signature.
3. DO NOT label more than one person as "Agent" or "Customer" unless they are clearly the same identity.

Provide ONLY the transcript text in the specified format."""

# Prompt for RAG Context querying
RAG_QA_PROMPT = """Answer based **only** on the context below. Be concise and factual.
If not enough information, reply exactly: "Insufficient information in documents."

Context:
{context}

Question: {question}

Answer:"""
