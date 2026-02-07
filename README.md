# DreamSync 🌟

**DreamSync** is a collaborative bucket list and journey tracking application. It empowers users to document their dreams, turn them into actionable journeys, and collaborate with friends.

## 🚀 Key Features

- **Bucket List Management**: Add, track, and organize your life goals (Dreams).
- **Journeys**: Collaborative adventures where you can invite friends to join your dreams.
- **Community Feed**: Share your public dreams and get inspired by others.
- **Real-time Chat**: Integrated chat for communicating with friends.
- **Smart Updates**: Instant feedback with background synchronization for a seamless experience.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Backend / Database**: [Firebase](https://firebase.google.com/) (Firestore, Auth)

## 📂 Project Structure

```bash
├── app/                  # Expo Router screens and navigation layout
│   ├── (tabs)/           # Main tab navigation (Home, Community, Journeys, Account)
│   ├── item/             # Dream detail screens
│   ├── chat/             # Chat screens
│   └── ...               # Other routes
├── src/
│   ├── components/       # Reusable UI components
│   ├── services/         # Firebase service logic (Auth, Firestore)
│   ├── store/            # Zustand global stores (Bucket, Community)
│   ├── stores/           # Chat state management
│   ├── theme/            # Theme configuration
│   └── types/            # TypeScript type definitions
├── constants/            # App constants (Colors, Layout)
├── hooks/                # Custom React hooks (Theming)
└── docs/                 # Documentation and future plans
```

## 🏎️ Getting Started

### Prerequisites

- Node.js (LTS recommended)
- Expo Go app on your mobile device (iOS/Android)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd DreamSync
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment:**
    Ensure you have a valid `.env` file with your Firebase configuration keys.

4.  **Start the development server:**
    ```bash
    npx expo start
    ```

5.  **Run on device:**
    Scan the QR code with Expo Go (Android) or Camera app (iOS).

## 🧠 AI Workflows

This project utilizes specific AI workflows (`.agent/`) to maintain quality and consistency.

-   **/plan**: Plan complex features before coding.
-   **/debug**: Systematic debugging process.
-   **/enhance**: Iterative feature improvements.
-   **/create**: Scaffolding new components or modules.

Refer to `GEMINI.md` for detailed agent protocols.

## 🤝 Contributing

1.  Create a new branch for your feature (`git checkout -b feature/amazing-feature`).
2.  Commit your changes (`git commit -m 'Add some amazing feature'`).
3.  Push to the branch (`git push origin feature/amazing-feature`).
4.  Open a Pull Request.

---
*Built with ❤️ for dreamers.*
