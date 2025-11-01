# Chat Moderation System

## Overview
A sophisticated real-time chat application with comprehensive moderation features. Built with React, TypeScript, and WebSocket for instant communication. Features a Discord/Slack-inspired design with role-based access control and advanced admin capabilities.

## Project Status
**Phase:** ✅ MVP COMPLETE - All features implemented, tested, and approved
**Status:** Production-ready real-time chat moderation system

## Architecture

### User Roles
1. **ad** (password: adbk) - Regular chat user
2. **shainez** (password: moije123456) - Regular chat user  
3. **pronBOT** (password: Ballon:)2008) - Administrator with full control panel

### Key Features Implemented

#### For All Users
- Real-time messaging with WebSocket
- Live typing indicators
- Connected users list with online/offline status
- Chat closure timer (visible countdown)
- Event notifications in red banners
- Flash messages that auto-disappear
- Beautiful animations and transitions

#### For Regular Users (ad, shainez)
- Send messages that require admin approval
- View own pending messages with status badges
- View all approved messages
- Message cooldown enforcement
- Character counter (0-1000 chars)

#### For Admin (pronBOT)
- **Dual View Modes:**
  - Chat view with quick controls sidebar
  - Full admin panel with live chat preview
  
- **Message Moderation:**
  - Approve/reject/force-publish pending messages
  - View message queue with previews
  - Send event messages (red banners for all users)
  - Send flash messages (auto-disappear after X seconds)
  
- **Chat Controls:**
  - Enable/disable chat globally
  - Set message cooldown (0-∞ seconds)
  - Set chat closure timer (visible to all)
  - Simulation mode for testing
  - **Chat direct mode** (nouveau) - Messages auto-approuvés sans validation
  
- **User Management:**
  - Mute users for X minutes
  - Hide users from list (invisible, messages blocked)
  - Unhide users
  - View active mutes with countdown
  
- **Content Filtering:**
  - Add/remove blocked words/phrases
  - Real-time word filtering
  - Case-insensitive matching
  
- **Advanced Actions:**
  - Clear message history
  - Reset all timers and cooldowns
  - Trigger global animations (flash, warning)
  - Export history (TXT format détaillé ou JSON format complet)
  - Force-publish messages bypassing approval
  - **Delete messages** (nouveau) - Suppression de n'importe quel message depuis le chat

### Design System

Following Discord/Slack patterns with:
- **Colors:** Blue (primary), Purple/Destructive accents
- **Typography:** Inter (UI), JetBrains Mono (timestamps, code)
- **Spacing:** 4px base unit (2, 3, 4, 6, 8, 12 scale)
- **Animations:** 
  - Message entrance: slide-up + fade-in (300ms)
  - Pending badge: pulse-glow animation
  - Typing dots: bouncing animation (1.4s cycle)
  - Flash messages: bounce-subtle
  - Rejection: shake animation
  - Timer warning: pulse-glow when <5min

### Component Structure

```
client/src/
├── pages/
│   ├── Login.tsx          # Role selection + authentication
│   └── Chat.tsx           # Main chat interface with layouts
├── components/
│   ├── MessageList.tsx    # Message display with animations
│   ├── MessageInput.tsx   # Send messages with cooldown
│   ├── UserList.tsx       # Online/offline users sidebar
│   ├── TypingIndicator.tsx # "X is typing..." display
│   ├── TimerDisplay.tsx   # Floating countdown timer
│   ├── PendingMessages.tsx # Admin approval queue
│   └── AdminControls.tsx  # Full admin panel controls
├── hooks/
│   └── useWebSocket.ts    # WebSocket connection & state
└── App.tsx                # Auth state + routing
```

### Data Schema

```typescript
User {
  id, username, role, isOnline, isMuted, mutedUntil, isHidden
}

Message {
  id, userId, username, role, content, timestamp
  status: "pending" | "approved" | "rejected"
  type: "normal" | "event" | "flash"
  forcePublished?, flashDuration?
}

ChatConfig {
  enabled, cooldown, timerEndTime?, simulationMode, directChatEnabled
}

MutedUser { username, mutedUntil }
BlockedWord { word, addedAt }
TypingUser { username, timestamp }
```

### WebSocket Events (To Be Implemented)

**Client → Server:**
- `auth`: { username, role }
- `send_message`: { content }
- `typing`: { isTyping }
- `approve_message`: { messageId }
- `reject_message`: { messageId }
- `force_publish`: { messageId }
- `send_event`: { content }
- `send_flash`: { content, duration }
- `update_config`: { config }
- `mute_user`: { username, duration }
- `unmute_user`: { username }
- `hide_user`: { username }
- `unhide_user`: { username }
- `add_blocked_word`: { word }
- `remove_blocked_word`: { word }
- `clear_history`: {}
- `reset_timers`: {}
- `trigger_animation`: { animationType }
- `export_history`: { format }

**Server → Client:**
- `initial_state`: Full state on connect
- `message`: New approved message
- `pending_message`: New pending message
- `flash_message`: Temporary message
- `message_approved`: Message approved
- `message_rejected`: Message rejected
- `user_joined`: User connected
- `user_left`: User disconnected
- `users_update`: Full user list
- `typing_update`: Typing users list
- `config_update`: Config changed
- `muted_users_update`: Muted users list
- `blocked_words_update`: Blocked words list
- `messages_cleared`: History cleared
- `animation_trigger`: Global animation

## Technology Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- WebSocket (native browser API)
- Wouter (routing - not used, single-page app)
- React Hook Form + Zod validation
- Lucide React icons

**Backend:** (To be implemented)
- Node.js + Express
- WebSocket Server (`ws` package)
- In-memory storage (persistent during runtime)

## Development Notes

- All credentials are hardcoded for demo purposes
- Storage is in-memory but persists during server runtime
- Design follows `design_guidelines.md` specifications
- All interactive elements have data-testid attributes
- Responsive: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
- Animations use custom Tailwind keyframes
- Auto-scroll in messages unless user scrolls up
- Timer displays only when set, dismissible per session
- Typing indicators auto-clear after 3s of inactivity

## Backend Implementation

**In-Memory Storage Features:**
- User management with online/offline tracking
- Message storage with pending/approved states
- Chat configuration (enabled, cooldown, timer, simulation mode)
- Muted users with auto-expiry
- Blocked words with case-insensitive matching
- Typing indicators with 5s auto-cleanup

**WebSocket Event Handlers:**
- ✅ Authentication with role-based access
- ✅ Send message with validation (length, blocked words, muted check)
- ✅ Approve/reject/force-publish messages
- ✅ Event messages (red banners)
- ✅ Flash messages (auto-delete)
- ✅ Typing indicators
- ✅ User mute/unmute
- ✅ User hide/unhide
- ✅ Blocked words add/remove
- ✅ Config updates (chat enable, cooldown, timer)
- ✅ Clear history
- ✅ Reset timers
- ✅ Animation triggers
- ✅ Export history (TXT/JSON)
- ✅ Heartbeat/ping for connection health

**Business Logic:**
- Message approval workflow (pending → approved/rejected)
- Auto-cleanup of expired mutes
- Auto-cleanup of inactive typing indicators
- Blocked word filtering on send
- Role-based permission checks
- Flash message auto-deletion timers

## Testing Results

**End-to-End Test Suite:** ✅ All 12 scenarios PASSED
- Multi-role login (ad, shainez, pronBOT)
- Message approval workflow (pending → approved/rejected)
- Admin controls (chat enable/disable, mute, blocked words, timer, events)
- Real-time WebSocket updates across multiple users
- Typing indicators with auto-cleanup
- Clear history and logout flows

**Known Minor Issues (Non-blocking):**
- Empty div artifact after clear history (visual state correct)
- Occasional timing sensitivity on control toggles (resilient)

**Architect Approval:** ✅ PASS
- All functional requirements met
- Comprehensive data-testid instrumentation
- No security issues identified
- Production-ready with optional cleanup opportunities

## Recent Changes

**2025-11-01:** ✅ NOUVELLES FONCTIONNALITÉS AJOUTÉES
- **Mode Chat Direct:**
  - Nouvel toggle dans le panneau admin pour activer/désactiver le chat direct
  - Quand activé, les messages des utilisateurs sont auto-approuvés sans validation admin
  - Champ `directChatEnabled` ajouté au ChatConfig (persiste dans GitHub)
  
- **Suppression de Messages:**
  - Bouton de suppression visible au survol pour chaque message (uniquement pour pronBOT)
  - Événement WebSocket `delete_message` pour supprimer les messages en temps réel
  - Broadcast de la suppression à tous les clients connectés
  
- **Alerte Timer Critique:**
  - Bannière rouge pleine largeur en haut de l'écran quand il reste <1 minute
  - Message d'avertissement : "⚠️ ATTENTION : Le chat ferme dans moins d'une minute !"
  - Animation pulse-glow pour attirer l'attention
  - Timer normal (coin supérieur droit) pour >1 minute restant
  
- **Export TXT Amélioré:**
  - Header détaillé avec date d'export, total de messages, statut du chat
  - Format enrichi : Date complète + Heure + [RÔLE] + [TYPE] + Utilisateur: Message
  - Métadonnées de configuration (enabled, directChatEnabled, cooldown)
  - Footer de fin d'export
  - Nom de fichier avec date : `chat-export-YYYY-MM-DD.txt`
  
- **Robustesse du Storage:**
  - Correction du bug de chargement quand `storageData.config` est undefined
  - Defaults explicites pour tous les champs de ChatConfig
  - Protection contre les crashes au démarrage

**Fichiers modifiés:** 8 fichiers (schema, storage, routes, useWebSocket, AdminControls, MessageList, Chat, TimerDisplay)
**Fichiers créés:** utility.json (documentation des modifications)
**Revue Architecte:** ✅ PASS

**2024-11-01:** MVP COMPLETE + GitHub Persistence ✅
- **GitHub Persistence Implemented:**
  - Created GitHubStorage class with full GitHub API integration
  - Automatic save with 2-second debounce to minimize API calls
  - Graceful fallback when GitHub is unavailable (logs warning, continues with in-memory)
  - Persists: messages, mutedUsers, blockedWords, config
  - Users remain session-based (not persisted)
  
- **New Admin Features:**
  - **Delete Message:** Admins can now delete any message (delete_message event)
  - **Send Warning:** New send_warning event for yellow warning messages
  - **Improved Exports:**
    - TXT format: `[HH:MM] username: message` (only approved messages)
    - JSON format: Full chat-storage.json with all data
  
- **Timer Auto-Disable:**
  - Timer now automatically disables chat when time expires
  - Sends system message: "⏰ Le chat est fermé, fin du timer."
  - Broadcasts config update to all clients
  - Persists new state to GitHub
  
- **Session Persistence:**
  - Login state saved to localStorage
  - Auto-restore on page reload
  - No more disconnection on refresh
  - Cleared on manual logout
  
- **Configuration Improvements:**
  - handleUpdateConfig now preserves all config fields
  - No more accidental overwriting of concurrent updates
  
**Setup Required:**
- GitHub Token needs repo write permissions for persistence
- Current token returns 401 - needs to be updated in Secrets
- Repo: le-tueur/chatvc
- File: chat-storage.json
- Branch: main

**Previous (2024-11-01):** MVP COMPLETE ✅
- Implemented complete data schema with all interfaces
- Added custom animations to Tailwind config
- Created beautiful login page with role selection
- Built complete chat interface with message list, input, and typing indicators
- Implemented user list sidebar with online/offline states
- Created admin-only pending messages queue
- Built comprehensive admin controls panel
- Added timer display component
- Configured split-view layout for admin (chat + controls)
- All components follow design guidelines with proper spacing, typography, and animations
- Added data-testid attributes throughout for testing
- **Implemented complete WebSocket server with all event handlers**
- **Built comprehensive in-memory storage system**
- **Added message validation and filtering logic**
- **Implemented auto-cleanup for mutes and typing indicators**
- **Added heartbeat/ping for connection health**
