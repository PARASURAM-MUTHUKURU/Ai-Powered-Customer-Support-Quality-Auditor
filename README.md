# AuditAI: GenAI Customer Support Auditor 🚀

AuditAI is a powerful, GenAI-driven platform designed to automate the auditing of customer support interactions. It analyzes chat and call transcripts to assign quality scores, detect compliance violations, and provide real-time performance analytics.

## 🌟 Key Features
- **Multi-Channel Auditing**: Process both text chats and voice call recordings.
- **Contextual RAG Retrieval**: Cross-references transcripts with uploaded policy documents/manuals using Retrieval-Augmented Generation (RAG).
- **Interactive Bot Simulation**: Simulate customer calls with an AI agent to test responses and training.
- **Real-Time Dashboards**: Visualize agent performance, compliance trends, and quality scores.
- **Advanced Reporting**: Generate comprehensive PDF reports for audit results.
- **Multi-Agent Support**: Track and manage performance across multiple support agents.
- **AI-Powered Insights**: Uses Gemini 1.5 Flash for high-accuracy transcription and auditing logic.

---

## 🛠️ Tech Stack

### Backend (Python/FastAPI)
- **FastAPI**: High-performance web framework for the API layer.
- **LangChain**: Orchestrates the RAG pipeline and LLM interactions.
- **Qdrant**: Vector database for storing and searching policy embeddings.
- **SQLite**: Local database for persisting audit results and agent data.
- **Gemini 1.5 Flash**: Used for transcription, document embedding, and quality auditing.
- **FPDF2**: For generating PDF reports.
- **PyMuPDF & pypdf**: For parsing policy documents (PDF/DOCX).

### Frontend (React/Vite)
- **React 19**: Modern UI library with functional components and hooks.
- **Tailwind CSS**: Utility-first CSS for premium, responsive design.
- **Recharts**: For interactive data visualizations and analytics.
- **Motion (Framer Motion)**: For smooth micro-animations and transitions.
- **Lucide React**: Premium icon set for better UX.

---

## ?? Dataset
You can find the dataset used for this project here: [Google Drive Dataset](https://drive.google.com/drive/folders/1QKoW8UD8MRZGL8puJnlznznZhc-LcaK9?usp=drive_link)


---

## ⚙️ How it Works

### 1. Ingestion & RAG Pipeline
When a policy document is uploaded, it is:
1.  **Chunked**: Broken into smaller segments using `RecursiveCharacterTextSplitter`.
2.  **Embedded**: Converted into high-dimensional vectors via Gemini Embeddings.
3.  **Indexed**: Stored in **Qdrant** for semantic retrieval.

### 2. Auditing Workflow
1.  **Transcription**: Audio calls are transcribed into text using Gemini's multimodal capabilities.
2.  **Retrieval**: The RAG pipeline searches the knowledge base for policies relevant to the transcript.
3.  **Synthesis**: Gemini analyzes the transcript + retrieved policies to detect violations and calculate scores.
4.  **Persistence**: Results are stored in SQLite and served via REST endpoints.

### 3. Visualization & Reporting
The **Dashboard Hub** fetches cumulative stats from the backend and renders them into interactive charts. Users can also export detailed audit findings as PDF reports for offline review and compliance records.

---

## 🎯 Why AuditAI?
- **Efficiency**: Reduces manual audit time by up to 90%.
- **Objectivity**: Ensures consistent evaluation markers across all agents.
- **Proactive Compliance**: Catches violations before they become systemic issues.
- **Data-Driven Coaching**: Provides managers with concrete metrics to guide agent training.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Qdrant Instance (Local Docker or Cloud)
- Google Gemini API Key

### Installation
1.  **Clone the Repo**:
    ```bash
    git clone [your-repo-url]
    cd transcipt
    ```
2.  **Setup Backend**:
    ```bash
    cd backend
    pip install -r requirements.txt
    # Configure your .env with GOOGLE_API_KEY, QDRANT_URL, etc.
    python main.py
    ```
3.  **Setup Frontend**:
    ```bash
    cd ../frontend
    npm install
    npm run dev:client
    ```

---

## 🧪 Testing & Quality Assurance

AuditAI employs a multi-layered testing strategy to ensure the reliability of its GenAI evaluations and system performance.

- **Manual Testing**: Comprehensive workflows for verifying data ingestion, RAG retrieval, and dashboard accuracy.
- **AI Evaluation**: Specialized metrics (Faithfulness, Relevancy, Precision) to validate Gemini's audit logic.
- **Performance Benchmarking**: Latency targets for transcription and AI synthesis.
- **Results & Analysis**: Detailed performance results and discussion can be found in [RESULTS.md](RESULTS.md).

For a detailed breakdown of our testing procedures, see [TESTING.md](TESTING.md).

---

## 📁 Project Structure
```text
transcipt/
├── backend/
│   ├── rag/           # RAG Pipeline modules (Query, Ingest, Store)
│   ├── routers/       # API route handlers (Audits, Agents, Analytics, Reports)
│   ├── main.py        # FastAPI entry point
│   └── .env.local     # Backend secrets
├── frontend/
│   ├── src/
│   │   ├── components/# React UI components (Dashboards, Reports, Views)
│   │   └── services/  # API & LLM services
│   └── .env.local     # Frontend configuration
└── data/              # Sample policy documents
```

---

## 📚 References

For a detailed list of academic papers, technical documentation, and industry standards used in this project, see the [REFERENCES.md](REFERENCES.md) file.

### Key Citations
- **RAG Architecture**: Lewis, P., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. [arXiv:2005.11401](https://arxiv.org/abs/2005.11401).
- **LLM Engine**: Gemini Team, Google. (2024). *Gemini 1.5: Unlocking multimodal understanding*. [arXiv:2403.05530](https://arxiv.org/abs/2403.05530).
- **Infosys Springboard**: This project was developed as part of the **Infosys Springboard 6.0** GenAI track.

