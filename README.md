# 🌟 DevRanbir Portfolio

> A modern, interactive portfolio website built with React, Firebase, and cutting-edge web technologies.

[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.10.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.178.0-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![GSAP](https://img.shields.io/badge/GSAP-3.13.0-88CE02?style=for-the-badge&logo=greensock&logoColor=black)](https://greensock.com/)

## ✨ Overview

Welcome to my personal portfolio – a sophisticated digital showcase that combines modern web technologies with elegant design. This isn't just a static website; it's an interactive experience featuring real-time chat, 3D visuals, GitHub integration, and a complete content management system.

### 🎯 Key Highlights

- **🚀 Real-time Everything**: Live chat system with Firebase integration
- **🎨 3D Interactive Visuals**: Powered by Three.js and Spline
- **🔄 GitHub Sync**: Automatic project synchronization from GitHub repositories
- **💫 Smooth Animations**: GSAP-powered transitions and Framer Motion
- **📱 Fully Responsive**: Optimized for all devices and screen sizes
- **🛡️ Secure & Scalable**: Firebase backend with proper security rules

## 🌐 Live Demo

🔗 **[Visit Portfolio](https://DevRanbir.github.io)**

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Frontend Layer                      │
│  React 19 + Router + Modern CSS + Animations       │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│                Firebase Layer                       │
│  Firestore + Real-time DB + A. Authentication      │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────┐
│              External APIs                          │
│  GitHub API + Discord (Lanyard) + Spline 3D        │
└─────────────────────────────────────────────────────┘
```

## 🎨 Features

### 🏠 **Homepage**
- **Interactive Command Line Interface**: Windows Explorer-style navigation
- **Dynamic Social Links**: Real-time Firebase sync
- **3D Background**: Spline-powered interactive visuals
- **Live Status**: Discord integration via Lanyard API
- **Skills Showcase**: Animated skill tags with descriptions

### 📁 **Documents Section**
- **File Management**: Upload and organize documents
- **Type Categorization**: Videos, images, PDFs, and more
- **Drag & Drop**: Intuitive file reordering
- **Real-time Sync**: Instant updates across all devices

### 🛠️ **Projects Showcase**
- **GitHub Integration**: Automatic project import and sync
- **Smart Categorization**: AI, Web, Mobile, Blockchain projects
- **Live Demo Links**: Direct access to deployed projects
- **Repository Links**: GitHub source code integration
- **User Edit Protection**: Manual edits preserved during sync

### 👤 **About Section**
- **Dynamic GitHub README**: Real-time profile sync
- **Social Media Integration**: Multiple platform links
- **Digital Clock**: Real-time display with animations
- **Interactive Elements**: Responsive design components

### 📞 **Contact Hub**
- **Interactive Social Bubbles**: Draggable contact elements
- **Live Chat System**: Real-time Firebase-powered messaging
- **Location Display**: Current status and availability
- **Contact Management**: Admin-friendly editing interface

### 💬 **Chat System**
- **Anonymous Messaging**: Privacy-focused user identification
- **Real-time Communication**: Instant message delivery
- **Thread Management**: Organized conversation structure
- **Auto-cleanup**: Scheduled message expiration
- **Fullscreen Mode**: Enhanced chat experience

### 🎛️ **Admin Dashboard**
- **Content Management**: Edit all sections in real-time
- **GitHub Sync Control**: Manual and automatic repository updates
- **Chat Administration**: Monitor and respond to messages
- **Data Analytics**: User engagement insights

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DevRanbir/devranbir.github.io.git
   cd devranbir
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   # Create .env file
   cp .env.example .env
   
   # Add your configuration
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_GITHUB_TOKEN=your_github_token
   REACT_APP_GITHUB_USERNAME=your_github_username
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Firebase Setup

1. **Create Firebase Project**
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Firestore Database
   - Configure authentication

2. **Update Configuration**
   ```javascript
   // src/firebase/config.js
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-domain.firebaseapp.com",
     projectId: "your-project-id",
     // ... other config
   };
   ```

3. **Security Rules** (Production)
   ```javascript
   // Firestore rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /website-content/{document} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

### GitHub Integration

1. **Personal Access Token**
   - Go to GitHub Settings → Developer settings
   - Generate new personal access token
   - Add `repo` and `user:read` scopes

2. **Environment Variables**
   ```bash
   REACT_APP_GITHUB_TOKEN=your_token_here
   REACT_APP_GITHUB_USERNAME=your_username
   ```

## 📦 Tech Stack

### Frontend
- **React 19** - Modern React with latest features
- **React Router 7** - Client-side routing
- **Three.js** - 3D graphics and animations
- **Framer Motion** - Smooth animations
- **GSAP** - Professional animations
- **CSS3** - Modern styling with custom properties

### Backend Services
- **Firebase Firestore** - Real-time database
- **Firebase Authentication** - User management
- **GitHub API** - Repository integration
- **Lanyard API** - Discord status integration

### 3D & Animations
- **Spline** - 3D scene creation
- **@react-three/fiber** - React Three.js renderer
- **@react-three/drei** - Three.js helpers
- **Lottie** - Vector animations

### Development Tools
- **ESLint** - Code linting
- **gh-pages** - Deployment automation
- **React Scripts** - Build tooling

## 📱 Responsive Design

The portfolio is fully responsive and optimized for:

- 📱 **Mobile**: Touch-friendly interface, optimized performance
- 💻 **Tablet**: Adaptive layouts, gesture support
- 🖥️ **Desktop**: Full feature set, keyboard shortcuts
- 📺 **Large Screens**: Enhanced visuals, expanded layouts

## 🔒 Security Features

- **Environment Variables**: Sensitive data protection
- **Firebase Security Rules**: Database access control
- **Anonymous Chat**: Privacy-focused messaging
- **CORS Configuration**: Cross-origin request protection
- **Input Validation**: XSS and injection prevention

## 🚀 Deployment

### GitHub Pages (Recommended)

```bash
# Build and deploy
npm run deploy
```

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy build folder to your hosting service
```

### Environment Variables for Production

Ensure these are set in your hosting environment:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_GITHUB_TOKEN`

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Test chat system
# Visit /contacts and use the chat feature
```

## 📊 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Bundle Size**: Optimized with code splitting
- **Loading Time**: < 3s on 3G connections
- **Core Web Vitals**: Excellent ratings

## 🛠️ Development

### File Structure

```
src/
├── components/          # React components
│   ├── Homepage.js     # Main landing page
│   ├── Projects.js     # Projects showcase
│   ├── About.js        # About section
│   ├── Contacts.js     # Contact hub
│   ├── ChatBox.js      # Real-time chat
│   └── Controller.js   # Admin dashboard
├── firebase/           # Firebase configuration
│   ├── config.js       # Firebase setup
│   └── firestoreService.js # Database operations
├── services/           # External API services
│   ├── githubRepoService.js
│   └── githubSyncService.js
├── utils/              # Utility functions
└── styles/             # CSS files
```

### Key Commands

```bash
npm start              # Development server
npm run build          # Production build
npm run deploy         # Deploy to GitHub Pages
npm test               # Run tests
npm run eject          # Eject from Create React App
```

### Admin Access

To access admin features:
1. Navigate to any section
2. Type `edit` in the command line
3. Enter the admin password
4. Use the controller interface for content management

## 🤝 Contributing

While this is a personal portfolio, suggestions and feedback are welcome!

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

## 📞 Support & Contact

- **Portfolio**: [DevRanbir.github.io](https://DevRanbir.github.io)
- **GitHub**: [@DevRanbir](https://github.com/DevRanbir)
- **Live Chat**: Available on the portfolio website
- **Issues**: [GitHub Issues](https://github.com/DevRanbir/devranbir.github.io/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** - For the amazing framework
- **Firebase** - For the robust backend services
- **Three.js Community** - For 3D graphics capabilities
- **Open Source Contributors** - For the amazing libraries used

## 🔮 Future Enhancements

- [ ] **AI Chatbot Integration** - Automated responses
- [ ] **Blog System** - Dynamic content publishing
- [ ] **Analytics Dashboard** - Visitor insights
- [ ] **Multi-language Support** - Internationalization
- [ ] **PWA Features** - Offline functionality
- [ ] **Voice Commands** - Voice-controlled navigation
- [ ] **AR/VR Integration** - Immersive experiences

---

<div align="center">

**Built with ❤️ by [DevRanbir](https://github.com/DevRanbir)**

*Showcasing the power of modern web technologies*

[![GitHub stars](https://img.shields.io/github/stars/DevRanbir/devranbir.github.io?style=social)](https://github.com/DevRanbir/devranbir.github.io/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/DevRanbir/devranbir.github.io?style=social)](https://github.com/DevRanbir/devranbir.github.io/network/members)

</div>
