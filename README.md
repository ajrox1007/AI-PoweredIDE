A modern, intelligent code editor built with React, TypeScript, and Express, featuring AI-powered coding assistance, real-time collaboration capabilities, and advanced debugging tools.
![WhatsApp Image 2025-09-15 at 16 45 11](https://github.com/user-attachments/assets/29e2b636-60ba-4d2d-ae45-d1eaa7195777)



https://github.com/user-attachments/assets/c7879b0d-a539-4bf4-815e-fa194dfc967e


![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

## 🌟 Features

### ✨ AI-Powered Coding Assistant
- **Intelligent Code Completion**: Context-aware code suggestions powered by OpenAI
- **Automated Testing**: Generate comprehensive test suites for your code
- **Code Explanation**: Get detailed explanations of complex code segments
- **Smart Refactoring**: AI-assisted code improvements and optimization
- **Bug Detection**: Automatic identification and fixing of code issues
- **Interactive Chat**: Natural language programming assistance

### 🛠️ Advanced Development Environment
- **Monaco Editor**: VS Code-like editing experience with syntax highlighting
- **Multi-Language Support**: JavaScript, TypeScript, Python, JSON, HTML, CSS, and more
- **Real-Time Terminal**: Integrated terminal with Docker support
- **Web Preview**: Live preview of web applications
- **File Management**: Complete file system with create, edit, delete operations
- **Command Palette**: Quick access to all IDE features (Ctrl/Cmd + K)

### 🎯 Specialized Features
- **Debugging Problem Generator**: Create complex Python debugging challenges for AI/ML engineers
- **Resizable Panels**: Customizable workspace layout
- **Local Storage**: Persistent file storage and session management
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and Radix UI

## 🚀 Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- npm or yarn package manager
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ajrox1007/AI-PoweredIDE.git
   cd AI-PoweredIDE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to start coding!

## 🏗️ Project Structure

```
AI-PoweredIDE/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/           # Reusable UI components (Radix UI)
│   │   │   ├── MonacoEditor.tsx
│   │   │   ├── AIChatPanel.tsx
│   │   │   ├── TerminalPanel.tsx
│   │   │   └── ...
│   │   ├── pages/            # Page components
│   │   ├── store/            # Zustand state management
│   │   ├── lib/              # Utility functions and services
│   │   └── hooks/            # Custom React hooks
├── server/                   # Express backend
│   ├── index.ts             # Main server file
│   ├── routes.ts            # API routes
│   ├── openai.ts            # OpenAI integration
│   ├── terminal.ts          # Terminal/Docker handling
│   └── ...
├── shared/                  # Shared types and schemas
└── package.json
```

## 🎮 Usage

### Getting Started
1. **Create or open files** using the sidebar file explorer
2. **Start coding** with intelligent autocomplete and syntax highlighting
3. **Use AI features** via the chat panel or command palette
4. **Run code** in the integrated terminal
5. **Preview web apps** with the built-in web preview

### Key Shortcuts
- `Ctrl/Cmd + K` - Open command palette
- `Ctrl/Cmd + S` - Save current file
- `Ctrl/Cmd + /` - Toggle line comment
- `F1` - Access AI assistant
- `Ctrl/Cmd + Shift + P` - Show all commands

### AI Features
- **Code Completion**: Start typing and get intelligent suggestions
- **Generate Tests**: Select code and use "Generate tests" from command palette
- **Explain Code**: Highlight code and ask the AI to explain it
- **Refactor Code**: Get suggestions for improving your code structure
- **Find Bugs**: Automatic bug detection and fixing suggestions

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Required for AI features
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Database configuration
DATABASE_URL=your_database_url_here

# Optional: Server configuration
PORT=3000
NODE_ENV=development
```

### Docker Support
The IDE supports Docker for code execution. If Docker is not available, it falls back to a simulated environment.

To enable Docker:
1. Install Docker Desktop
2. Ensure Docker daemon is running
3. The IDE will automatically detect and use Docker containers

## 🛠️ Development

### Building for Production
```bash
npm run build
npm start
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Run TypeScript checks
- `npm run db:push` - Push database schema changes

### Technology Stack

#### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Radix UI** - Component primitives
- **Monaco Editor** - Code editor
- **Zustand** - State management
- **React Query** - Data fetching

#### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **WebSocket** - Real-time communication
- **Dockerode** - Docker integration
- **OpenAI API** - AI features
- **Drizzle ORM** - Database management

#### Development Tools
- **ESBuild** - Fast bundling
- **TSX** - TypeScript execution
- **Drizzle Kit** - Database migrations

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure code passes all linting checks

## 📝 API Documentation

### AI Endpoints
- `POST /api/ai/complete` - Get code completions
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/generate-tests` - Generate test cases
- `POST /api/ai/explain-code` - Get code explanations
- `POST /api/ai/refactor-code` - Get refactoring suggestions
- `POST /api/ai/find-bugs` - Find and fix bugs
- `POST /api/ai/fix-snippet` - Fix code snippets

### Terminal Endpoints
- `POST /api/terminal/execute` - Execute terminal commands
- `GET /api/terminal/history` - Get command history
- `POST /api/terminal/clear-history` - Clear command history

## 🐛 Troubleshooting

### Common Issues

**Port 3000 already in use**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Docker not working**
- Ensure Docker Desktop is installed and running
- Check Docker socket permissions
- The IDE will fall back to simulation mode if Docker is unavailable

**AI features not working**
- Verify your OpenAI API key is correct
- Check your internet connection
- Ensure you have sufficient API credits

**File not saving**
- Check browser local storage limits
- Try refreshing the page
- Clear browser cache if persistent

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - For the amazing code editor
- [OpenAI](https://openai.com/) - For AI capabilities
- [Radix UI](https://www.radix-ui.com/) - For accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) - For utility-first styling
- [React](https://reactjs.org/) - For the UI framework

## 📞 Support

If you have any questions or need help:

1. Check the [Issues](https://github.com/ajrox1007/AI-PoweredIDE/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Happy Coding! 🚀**

Built with ❤️ by [Arjun Sethi](https://github.com/ajrox1007)
