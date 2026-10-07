# Intelligent Welding Training Simulator

## Overview
A complete web-based Intelligent Welding Training Simulator designed for TVET Mechanical Engineering Technician trainees. The system provides competency-based assessment, intelligent feedback, defect prediction, and learning analytics in a virtual welding environment.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Virtual   │ │ Real-Time│ │ Assess-  │ │ Learning  │  │
│  │ Workspace │ │ Monitor  │ │ ment     │ │ Analytics │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Defect   │ │ Feedback │ │ Compet-  │ │ AI Tutor  │  │
│  │ Prediction│ │ System   │ │ ency     │ │ Module    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                          │ REST API / WebSocket
┌─────────────────────────────────────────────────────────┐
│                   Backend (Node.js)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Auth     │ │ Assess-  │ │ Defect   │ │ Analytics │  │
│  │ Service  │ │ ment Svc │ │ Predict  │ │ Service   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│              Database (PostgreSQL / MongoDB)             │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ or MongoDB 6+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp config/.env.example config/.env
# Edit .env with your database credentials
npm run db:migrate
npm run db:seed
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## Project Structure
```
welding-simulator/
├── frontend/           # React frontend application
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── pages/      # Page components
│       ├── hooks/      # Custom React hooks
│       ├── utils/      # Utility functions
│       ├── styles/     # CSS styles
│       └── assets/     # Static assets
├── backend/            # Node.js backend
│   └── src/
│       ├── routes/     # API route definitions
│       ├── controllers/# Request handlers
│       ├── models/     # Data models
│       ├── middleware/  # Express middleware
│       ├── services/   # Business logic
│       └── utils/      # Utility functions
├── database/           # Database migrations and seeds
├── docs/               # Documentation
└── README.md
```

## Features
- 🔥 Virtual Welding Workspace with realistic torch control
- ⚙️ Adjustable welding parameters (speed, current, voltage, etc.)
- 📊 Real-time performance monitoring with live gauges
- 🎯 Intelligent assessment engine with scoring and grading
- 🔍 Defect prediction based on learner actions
- 💡 Personalized feedback system
- 🏆 Competency-based assessment framework
- 📈 Learning analytics dashboards (student & trainer)
- 🤖 AI-powered tutor for adaptive learning
- 🔐 Secure authentication and role-based access

## License
MIT
