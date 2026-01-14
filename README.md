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

## 🤖 Model Setup

This application is configured to use **`gemma3:4b`** by default. You need to pull this model (or any other you prefer) using Ollama.

1.  **Start Ollama** (if it's not already running).
2.  Open your terminal and run:

    ```bash
    ollama pull gemma3:4b
    ```

    *You can also pull other models like `llama3`, `mistral`, or `qwen` and select them in the app settings.*

## 🏃‍♂️ How to Run

1.  Start the development server (runs both the frontend and backend):

    ```bash
    npm run dev
    ```

2.  Open your browser and navigate to:

    ```
    http://localhost:5173
    ```

## 📦 Push to GitHub

To push this project to your own GitHub repository:

1.  Create a new repository on [GitHub](https://github.com/new).
2.  Run the following commands in your project folder:

    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git push -u origin main
    ```

## 🔧 Configuration

-   **Port**: The API server runs on port `3001` and the frontend on `5173` by default.
-   **Ollama URL**: The app expects Ollama to be running at `http://localhost:11434`.

## 📜 License

MIT License
