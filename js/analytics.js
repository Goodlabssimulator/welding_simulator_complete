/**
 * AnalyticsEngine - Learning analytics, progress tracking, AI tutor recommendations
 * Uses localStorage for persistence in this demo (replace with API in production)
 */

class AnalyticsEngine {
  constructor(userId) {
    this.userId = userId || 'demo_user';
    this.storageKey = `weldSim_${this.userId}`;
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return {
      profile: { name: 'Trainee', role: 'student', joinDate: new Date().toISOString() },
      attempts: [],
      competencies: {},
      aiTutorState: { patterns: [], suggestions: [], lastAdvice: null },
    };
  }

  _save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) { /* quota exceeded */ }
  }

  // ---- Record an Attempt ----
  recordAttempt(attemptData) {
    const attempt = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      ...attemptData,
    };
    this.data.attempts.push(attempt);
    this._save();
    return attempt;
  }

  // ---- Get All Attempts ----
  getAttempts() {
    return this.data.attempts;
  }

  // ---- Student Dashboard Data ----
  getStudentDashboard() {
    const attempts = this.data.attempts;
    const totalAttempts = attempts.length;
    
    if (totalAttempts === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        performanceTrend: [],
        competencyProgress: {},
        weakestSkills: [],
        strongestSkills: [],
        recentAttempts: [],
      };
    }

    const scores = attempts.map(a => a.overallScore || 0);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);

    // Performance trend (last 20)
    const recent = attempts.slice(-20);
    const performanceTrend = recent.map((a, i) => ({
      attempt: i + 1,
      score: a.overallScore || 0,
      date: a.timestamp,
      jointType: a.parameters?.jointType || 'butt',
    }));

    // Competency progress (average across all attempts)
    const competencyMap = {};
    for (const a of attempts) {
      if (a.competencies) {
        for (const c of a.competencies) {
          if (!competencyMap[c.competency]) competencyMap[c.competency] = [];
          competencyMap[c.competency].push(c.score);
        }
      }
    }

    const competencyProgress = {};
    for (const [key, vals] of Object.entries(competencyMap)) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const recent3 = vals.slice(-3);
      const recentAvg = recent3.length > 0 ? recent3.reduce((a, b) => a + b, 0) / recent3.length : avg;
      competencyProgress[key] = {
        average: Math.round(avg),
        recentAverage: Math.round(recentAvg),
        trend: recentAvg > avg ? 'improving' : recentAvg < avg ? 'declining' : 'stable',
        attempts: vals.length,
      };
    }

    // Weakest and strongest skills
    const skillEntries = Object.entries(competencyProgress).sort((a, b) => a[1].average - b[1].average);
    const weakestSkills = skillEntries.slice(0, 3).map(([name, data]) => ({ name, ...data }));
    const strongestSkills = skillEntries.slice(-3).reverse().map(([name, data]) => ({ name, ...data }));

    return {
      totalAttempts,
      averageScore,
      bestScore,
      performanceTrend,
      competencyProgress,
      weakestSkills,
      strongestSkills,
      recentAttempts: attempts.slice(-10).reverse(),
    };
  }

  // ---- Trainer Dashboard Data ----
  getTrainerDashboard(allUsersData) {
    // In production, this would aggregate across all users from the DB
    // For demo, we simulate with the current user's data + mock class data
    const classData = this._generateMockClassData();
    
    return {
      totalStudents: classData.length,
      classAverage: Math.round(classData.reduce((s, d) => s + d.averageScore, 0) / classData.length),
      competencyAchievement: this._aggregateClassCompetencies(classData),
      commonMistakes: this._findCommonMistakes(classData),
      studentProgress: classData.map(s => ({
        name: s.name,
        attempts: s.attempts,
        averageScore: s.averageScore,
        bestScore: s.bestScore,
        weakestArea: s.weakestArea,
      })),
    };
  }

  _generateMockClassData() {
    const names = ['Ahmed K.', 'Fatima M.', 'John D.', 'Grace N.', 'Peter O.', 'Sarah L.', 'David W.', 'Hannah T.', 'James R.', 'Maria S.'];
    return names.map(name => {
      const avg = 35 + Math.random() * 55;
      const weakAreas = ['Travel Speed Control', 'Torch Control', 'Defect Identification', 'Weld Quality Evaluation', 'Safety Awareness'];
      return {
        name,
        attempts: Math.floor(3 + Math.random() * 15),
        averageScore: Math.round(avg),
        bestScore: Math.round(avg + 10 + Math.random() * 15),
        weakestArea: weakAreas[Math.floor(Math.random() * weakAreas.length)],
      };
    });
  }

  _aggregateClassCompetencies(classData) {
    const competencies = [
      'Joint Preparation', 'Welding Parameter Selection', 'Torch Control',
      'Travel Speed Control', 'Defect Identification', 'Weld Quality Evaluation', 'Safety Awareness'
    ];
    return competencies.map(c => ({
      competency: c,
      competent: Math.round(20 + Math.random() * 40),
      developing: Math.round(15 + Math.random() * 30),
      notYetCompetent: Math.round(10 + Math.random() * 25),
    }));
  }

  _findCommonMistakes(classData) {
    return [
      { mistake: 'Excessive travel speed', frequency: '65%', impact: 'Lack of penetration' },
      { mistake: 'Inconsistent speed', frequency: '52%', impact: 'Porosity, uneven bead' },
      { mistake: 'Incorrect current setting', frequency: '38%', impact: 'Poor fusion or burn-through' },
      { mistake: 'Poor path alignment', frequency: '35%', impact: 'Lack of fusion' },
      { mistake: 'Excessive workpiece gap', frequency: '28%', impact: 'Burn-through' },
    ];
  }

  // ---- AI Tutor ----
  getAITutorInsights() {
    const attempts = this.data.attempts;
    const patterns = [];
    const suggestions = [];

    if (attempts.length < 2) {
      return {
        patterns: [],
        suggestions: [
          { type: 'welcome', text: 'Complete a few welding exercises so I can analyze your patterns and provide personalized guidance.', exercise: null },
        ],
        advice: 'Welcome! Start with a basic butt joint exercise to establish your baseline performance.',
      };
    }

    // Detect repeated mistakes
    const recentAttempts = attempts.slice(-5);
    const speedIssues = recentAttempts.filter(a => (a.subscores?.speedAccuracy || 0) < 55).length;
    const alignmentIssues = recentAttempts.filter(a => (a.subscores?.jointAlignment || 0) < 55).length;
    const consistencyIssues = recentAttempts.filter(a => (a.subscores?.weldConsistency || 0) < 50).length;

    if (speedIssues >= 3) {
      patterns.push('You consistently struggle with travel speed control — this has been an issue in ' + speedIssues + ' of your last ' + recentAttempts.length + ' attempts.');
      suggestions.push({
        type: 'speed',
        text: 'Practice the "Steady Speed" exercise: focus solely on maintaining a constant speed, even if your path deviates slightly.',
        exercise: 'steady_speed',
      });
      suggestions.push({
        type: 'speed',
        text: 'Try using a rhythmic counting technique: count "1-2-3-4" at a steady pace and move the torch on each count.',
        exercise: null,
      });
    }

    if (alignmentIssues >= 3) {
      patterns.push('Path alignment is a recurring weakness — your torch frequently deviates from the joint line.');
      suggestions.push({
        type: 'alignment',
        text: 'Practice the "Straight Line" exercise: weld along a straight guide without worrying about speed.',
        exercise: 'straight_line',
      });
    }

    if (consistencyIssues >= 3) {
      patterns.push('Inconsistent technique appears to be a pattern — your weld quality varies significantly within each attempt.');
      suggestions.push({
        type: 'consistency',
        text: 'Practice short, focused weld segments (2–3 cm each) rather than trying to weld the full length at once.',
        exercise: null,
      });
    }

    // Check for improvement
    const oldScores = attempts.slice(0, Math.ceil(attempts.length / 2)).map(a => a.overallScore || 0);
    const newScores = attempts.slice(Math.ceil(attempts.length / 2)).map(a => a.overallScore || 0);
    const oldAvg = oldScores.reduce((a, b) => a + b, 0) / (oldScores.length || 1);
    const newAvg = newScores.reduce((a, b) => a + b, 0) / (newScores.length || 1);

    if (newAvg > oldAvg + 5) {
      patterns.push('Your overall performance is improving — great progress!');
    } else if (newAvg < oldAvg - 5) {
      patterns.push('Your recent performance has dipped compared to earlier attempts. Consider revisiting fundamentals.');
      suggestions.push({
        type: 'fundamentals',
        text: 'Take a step back and practice the basic butt joint with default settings to rebuild your technique.',
        exercise: 'basic_butt',
      });
    }

    // General advice
    const latestScore = attempts[attempts.length - 1]?.overallScore || 0;
    let advice = '';
    if (latestScore >= 80) {
      advice = 'Excellent work! You're performing at a high level. Challenge yourself with more advanced joint types and positions.';
      suggestions.push({ type: 'advance', text: 'Try a vertical position T-joint or overhead butt joint to test your advanced skills.', exercise: 'advanced_joint' });
    } else if (latestScore >= 55) {
      advice = 'Good progress! Focus on your identified weaknesses to push your score higher. Consistent practice is key.';
    } else {
      advice = 'Keep practicing! Focus on one skill at a time — mastering travel speed first, then alignment, then consistency.';
    }

    if (patterns.length === 0) {
      patterns.push('No strong negative patterns detected — you're performing reasonably across all areas.');
    }

    return { patterns, suggestions, advice };
  }

  // ---- Recommended Exercises ----
  getRecommendedExercises() {
    const dashboard = this.getStudentDashboard();
    const exercises = [];

    if (dashboard.totalAttempts === 0) {
      exercises.push({
        id: 'basic_butt',
        name: 'Basic Butt Joint',
        difficulty: 'beginner',
        description: 'Practice a simple flat-position butt joint with default settings.',
        settings: { jointType: 'butt', weldingPosition: 'flat', workpieceThickness: 6, workpieceGap: 2 },
      });
    } else {
      const weakest = dashboard.weakestSkills;
      for (const w of weakest) {
        if (w.name === 'Travel Speed Control') {
          exercises.push({
            id: 'steady_speed',
            name: 'Steady Speed Drill',
            difficulty: 'beginner',
            description: 'Focus on maintaining a consistent travel speed along a straight path.',
            settings: { jointType: 'butt', weldingPosition: 'flat' },
          });
        }
        if (w.name === 'Torch Control') {
          exercises.push({
            id: 'path_accuracy',
            name: 'Path Accuracy Drill',
            difficulty: 'intermediate',
            description: 'Practice keeping the torch precisely on the joint line.',
            settings: { jointType: 'butt', weldingPosition: 'flat' },
          });
        }
        if (w.name === 'Defect Identification') {
          exercises.push({
            id: 'defect_awareness',
            name: 'Defect Awareness Challenge',
            difficulty: 'intermediate',
            description: 'Identify defects in pre-welded samples and recommend corrections.',
            settings: {},
          });
        }
      }
    }

    // Always include an advanced exercise
    exercises.push({
      id: 'advanced_tee',
      name: 'T-Joint Vertical Position',
      difficulty: 'advanced',
      description: 'Challenge yourself with a vertical T-joint requiring precise control.',
      settings: { jointType: 'tee', weldingPosition: 'vertical', workpieceThickness: 8 },
    });

    return exercises;
  }

  // ---- Competency History ----
  getCompetencyHistory(competencyName) {
    return this.data.attempts
      .filter(a => a.competencies?.some(c => c.competency === competencyName))
      .map((a, i) => {
        const c = a.competencies.find(c => c.competency === competencyName);
        return { attempt: i + 1, score: c.score, level: c.level, date: a.timestamp };
      });
  }

  // ---- Clear Data ----
  clearData() {
    this.data = {
      profile: this.data.profile,
      attempts: [],
      competencies: {},
      aiTutorState: { patterns: [], suggestions: [], lastAdvice: null },
    };
    this._save();
  }
}
