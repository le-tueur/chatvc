# Chat Moderation System

## Overview
A sophisticated real-time chat application with comprehensive moderation features, built with React, TypeScript, and WebSockets. It offers a Discord/Slack-inspired design, role-based access control, and advanced admin capabilities, including an AI-powered moderation bot. The system is designed for instant communication and robust content control, ready for production use.

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

## System Architecture
The system is built around a client-server architecture using React/TypeScript for the frontend and Node.js/Express for the backend, communicating via WebSockets.

### User Roles & Features
- **Regular Users (ad, shainez):** Real-time messaging, typing indicators, connected user list, chat closure timer, event/flash notifications, send messages requiring admin approval, view own pending messages, message cooldown, character counter.
- **Admin (pronBOT):** Dual view modes (chat with quick controls, full admin panel with live chat preview), comprehensive message moderation (approve/reject/force-publish/delete messages), chat controls (enable/disable chat, set cooldown/timer, direct mode for auto-approval), user management (mute/hide/unhide users), content filtering (add/remove blocked words), advanced actions (clear history, reset timers, trigger animations, export history), and full control over the AI bot.
- **AI Bot (pronbote):** Auto-connected, monitors all chat activity, auto-moderates insults, detects private messaging attempts, adapts personality based on user role (cold/brief to regular users, joyful/collaborative to admins), and can execute commands based on admin input.

### Design System
Inspired by Discord/Slack, featuring:
- **Colors:** Blue (primary), Purple/Destructive accents.
- **Typography:** Inter (UI), JetBrains Mono (timestamps, code).
- **Spacing:** 4px base unit scale.
- **Animations:** Slide-up/fade-in for messages, pulse-glow for pending badges and timer warnings, bouncing typing dots, subtle bounce for flash messages, shake for rejection.

### Technical Implementations
- **Frontend:** React 18, TypeScript, Tailwind CSS with shadcn/ui, native WebSocket API, React Hook Form, Zod validation, Lucide React icons.
- **Backend:** Node.js, Express, `ws` package for WebSocket server, in-memory storage (persisting during runtime), GitHub persistence for core data.
- **Real-time Communication:** Extensive WebSocket event handling for all interactions, including authentication, message flow, moderation actions, configuration updates, and bot commands.
- **Data Schema:** Defined structures for User, Message, ChatConfig, BotConfig, MutedUser, BlockedWord, and TypingUser.
- **Bot AI:** Modular architecture with `IAIProvider` interface, supporting `OllamaMistralProvider` (via Ollama) and `MockAIProvider` for auto-moderation and command execution. Bot configuration is persisted in GitHub.
- **Persistence:** GitHub-backed storage for messages, muted users, blocked words, and chat configuration, with a 2-second debounce for API calls. User sessions are persisted via localStorage.
- **UI/UX:** Responsive design for mobile, tablet, and desktop. Animations are used for dynamic feedback. Auto-scroll behavior for messages.

## External Dependencies
- **Ollama:** Used by `OllamaMistralProvider` for AI bot functionalities (requires `OLLAMA_BASE_URL`).
- **GitHub API:** For persistent storage of chat data (messages, config, muted users, blocked words) in a specified repository (`le-tueur/chatvc` file `chat-storage.json`). Requires a GitHub Token with repo write permissions.
- **Tailwind CSS:** For styling and design system implementation.
- **shadcn/ui:** UI component library.
- **Lucide React:** Icon library.