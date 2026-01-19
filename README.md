# Gamma UI - Local AI Chat Interface

Gamma UI is a modern, privacy-focused chat interface for local AI models powered by [Ollama](https://ollama.com/). It features a premium glassmorphism design, local chat history storage, and support for voice and image inputs.

## 🚀 Features

- **Local & Private**: All chats are stored locally in your browser.
- **Glassmorphism UI**: A sleek, modern interface with smooth animations.
- **Multi-Model Support**: Easily switch between installed Ollama models.
- **Voice & Image Support**: Interact with your AI using voice commands or by uploading images.
- **Web Search**: Integrated DuckDuckGo search for retrieving real-time information.
- **Markdown Rendering**: Full markdown support for code blocks, tables, and lists.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js** (v18 or higher): [Download Node.js](https://nodejs.org/)
2.  **Ollama**: [Download Ollama](https://ollama.com/download)

## 🛠️ Installation

1.  **Clone or Download** this repository.
2.  Open a terminal in the project directory.
3.  Install the dependencies:

    ```bash
    npm install
    ```

4.  **Install Python Dependencies** (Required for Image Generation & Transcription):
    Ensure you have Python 3.8+ installed.

    ```bash
    pip install numpy openai-whisper torch requests beautifulsoup4 duckduckgo-search diffusers transformers accelerate
    ```

## 🤖 Model Setup

This application defaults to **`gemma3:12b`** for a balance of performance and intelligence. You must pull this model (or another one) to use the app.

### 1. Install & Start Ollama
Download and install Ollama from [ollama.com](https://ollama.com). Once installed, ensure it is running:
- **Mac/Linux**: Run `ollama serve` in a terminal or check your menu bar.
- **Windows**: Ensure the Ollama tray icon is visible.

### 2. Pull a Model
Open your terminal and run the following command to download the recommended model:

```bash
ollama pull gemma3:12b
```

*Required space: ~8GB*

**Other popular models you can try:**
- `ollama pull llama3` (8GB) - Great all-rounder.
- `ollama pull mistral` (4GB) - Fast and efficient.
- `ollama pull qwen2.5:14b` (9GB) - Excellent reasoning.

### 3. Verify Installed Models
To see which models you have ready to use:

```bash
ollama list
```

## 🏃‍♂️ How to Run

1.  **Start the Application**:
    Runs both the frontend and backend concurrently.

    ```bash
    npm run dev
    ```

2.  **Open in Browser**:
    Navigate to: `http://localhost:5173`

## ❓ Troubleshooting

**"Ollama connection refused" / "Failed to fetch models"**
- Ensure Ollama is running. Run `ollama serve` in a dedicated terminal window.
- Check if Ollama is listening on the default port `11434`.

**"Model not found"**
- Run `ollama list` to see exact model names.
- Ensure the model selected in the app settings matches one in your list.
- If the app defaults to a model you don't have, go to settings and select one you do have.

## 📦 Push to GitHub

To push this project to your own GitHub repository:

1.  Create a new repository on [GitHub](https://github.com/new).
2.  Run the following commands in your project folder:

    ```bash
    git remote remove origin
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git push -u origin main
    ```

## 🔧 Configuration

-   **Frontend Port**: `5173` (Vite default)
-   **Backend Proxy**: Requests to `/ollama/api` are proxied to `http://localhost:11434`.
