# System Architecture

## High-Level Architecture

The Intelligent Welding Training Simulator follows a **modular, service-oriented architecture** designed for scalability, maintainability, and educational effectiveness.

## Component Architecture

### 1. Presentation Layer (Frontend)

```
┌─────────────────────────────────────────────────────┐
│                   React Application                   │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │              Page Router (React Router)        │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐   │
│  │  Login   │ │ Student  │ │ Trainer  │ │ Admin  │   │
│  │  Page    │ │ Dashboard│ │ Dashboard│ │ Panel  │   │
│  └─────────┘ └──────────┘ └──────────┘ └────────┘   │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │         Shared Component Library               │   │
│  │  ┌────────┐ ┌─────────┐ ┌───────┐ ┌───────┐  │   │
│  │  │Welding │ │ Gauge   │ │ Chart │ │Modal/ │  │   │
│  │  │Canvas  │ │ Panel   │ │ Widget│ │Toast  │  │   │
│  │  └────────┘ └─────────┘ └───────┘ └───────┘  │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │            State Management (Context + Hooks)  │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2. Application Layer (Backend)

```
┌─────────────────────────────────────────────────────┐
│                 Node.js / Express Server              │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │              API Gateway / Router              │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Auth    │ │ Welding  │ │ Assess-  │            │
│  │  Module  │ │  Engine  │ │ ment Svc │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Defect  │ │ Feedback │ │ Analytics│            │
│  │ Predictor│ │ Generator│ │  Engine  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                       │
│  ┌──────────┐ ┌──────────┐                          │
│  │   AI     │ │  Compet- │                          │
│  │  Tutor   │ │  ency Svc│                          │
│  └──────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────┘
```

### 3. Data Layer

```
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL Database                  │
│                                                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Users  │ │Welding │ │Assess- │ │Compet- │       │
│  │        │ │Attempts│ │ments   │ │encies  │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │Defects │ │Feed-   │ │Learn-  │ │Progress│       │
│  │        │ │backs   │ │ing     │ │History │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### Welding Session Flow
```
1. Trainee selects parameters → Frontend validates → API receives config
2. Trainee starts welding → Canvas captures mouse/touch events
3. Real-time telemetry → WebSocket stream → Backend processes
4. Session ends → Assessment engine evaluates → Score generated
5. Defect predictor analyzes → Defects identified → Feedback generated
6. Competency evaluator assesses → Competencies updated → Dashboard refreshes
```

### Assessment Pipeline
```
Raw Telemetry Data
    ↓
┌─────────────────┐
│ Data Preprocessor│  Clean, normalize, segment
└────────┬────────┘
         ↓
┌─────────────────┐
│ Feature Extractor│  Speed, accuracy, consistency, path
└────────┬────────┘
         ↓
┌─────────────────┐
│ Scoring Engine   │  Weighted multi-criteria scoring
└────────┬────────┘
         ↓
┌─────────────────┐
│ Grade Assigner   │  Distinction/Credit/Pass/Fail
└────────┬────────┘
         ↓
┌─────────────────┐
│ Defect Predictor │  Rule-based + pattern matching
└────────┬────────┘
         ↓
┌─────────────────┐
│ Feedback Builder │  Personalized narrative feedback
└────────┬────────┘
         ↓
┌─────────────────┐
│ Competency Eval  │  CBA framework assessment
└─────────────────┘
```

## API Design

### REST Endpoints
```
AUTH
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  DELETE  /api/auth/logout

WELDING
  GET    /api/welding/config
  POST   /api/welding/session/start
  PUT    /api/welding/session/:id/telemetry
  POST   /api/welding/session/:id/complete
  GET    /api/welding/session/:id
  GET    /api/welding/sessions

ASSESSMENT
  GET    /api/assessment/:sessionId
  GET    /api/assessment/:sessionId/defects
  GET    /api/assessment/:sessionId/feedback
  GET    /api/assessment/:sessionId/competency

ANALYTICS
  GET    /api/analytics/student/:id/summary
  GET    /api/analytics/student/:id/trends
  GET    /api/analytics/student/:id/competencies
  GET    /api/analytics/trainer/class-summary
  GET    /api/analytics/trainer/student/:id/progress
  GET    /api/analytics/trainer/common-mistakes
  GET    /api/analytics/trainer/competency-report

AI TUTOR
  GET    /api/tutor/:studentId/recommendations
  POST   /api/tutor/:studentId/practice
  GET    /api/tutor/:studentId/progress
```

### WebSocket Events
```
Client → Server:
  welding:telemetry    - Real-time welding data stream
  welding:start        - Session start notification
  welding:stop         - Session stop notification

Server → Client:
  welding:feedback     - Real-time performance hints
  welding:alert        - Safety/quality alerts
  assessment:complete  - Assessment results ready
```

## Security Architecture

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based (Student, Trainer, Admin)
- **Data Protection**: bcrypt password hashing, input sanitization
- **API Security**: Rate limiting, CORS, Helmet.js
- **Session Management**: Secure HTTP-only cookies

## Deployment Architecture

```
Internet → CDN (static assets)
         → Nginx (reverse proxy)
              → Frontend (React build)
              → Backend (Node.js cluster)
                   → PostgreSQL
                   → Redis (caching, sessions)
```

## Scalability Considerations

1. **Horizontal scaling**: Stateless backend servers behind load balancer
2. **Database**: Read replicas for analytics queries
3. **Caching**: Redis for session data and frequently accessed analytics
4. **WebSocket**: Sticky sessions or Redis pub/sub for multi-instance
5. **Static assets**: CDN for frontend build artifacts

## Future Expansion

- VR/AR integration via WebXR
- Multiplayer collaborative welding exercises
- Computer vision for real weld analysis (camera input)
- Integration with LMS platforms (LTI compliance)
- Mobile native app via React Native
- Advanced ML models for defect prediction
