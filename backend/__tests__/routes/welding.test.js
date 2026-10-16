/**
 * Integration test for the welding session lifecycle.
 */
const request = require('supertest');
const http = require('http');
const { app } = require('../../src/server');

let server;
let baseURL;
let accessToken;
let sessionId;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseURL = `http://127.0.0.1:${port}`;
}, 20000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  // Close the DB pool so Jest can exit cleanly
  const { pool } = require('../../src/utils/database');
  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }
});

describe('Full welding flow', () => {
  test('login → start → telemetry → complete → assessment', async () => {
    // 1. Login
    const loginRes = await request(baseURL)
      .post('/api/auth/login')
      .send({ email: 'student@weldsim.local', password: 'Student@12345' });

    expect(loginRes.status).toBe(200);
    accessToken = loginRes.body.tokens.accessToken;
    expect(accessToken).toBeDefined();

    // 2. Start session
    const startRes = await request(baseURL)
      .post('/api/welding/session/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        jointTypeId: 1,
        electrodeId: 1,
        positionId: 1,
        weldingSpeed: 4,
        weldingCurrent: 120,
        voltage: 24,
        workpieceGap: 2,
        workpieceThickness: 6,
      });

    expect(startRes.status).toBe(201);
    sessionId = startRes.body.session.id;
    expect(sessionId).toBeDefined();

    // 3. Submit telemetry
    const readings = [];
    for (let i = 0; i < 30; i++) {
      readings.push({
        timestamp_ms: i * 100,
        torch_x: 100 + i,
        torch_y: 200 + Math.sin(i / 5) * 3,
        speed: 4 + Math.random() * 0.3,
        path_deviation: Math.random() * 2,
        current_reading: 120,
        heat_input: 1.2,
        arc_length: 2,
        completion_pct: (i / 30) * 100,
      });
    }

    const telemetryRes = await request(baseURL)
      .put(`/api/welding/session/${sessionId}/telemetry`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ readings });

    expect(telemetryRes.status).toBe(200);
    expect(telemetryRes.body.count).toBe(30);

    // 4. Complete session
    const completeRes = await request(baseURL)
      .post(`/api/welding/session/${sessionId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ durationSeconds: 30 });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.assessment).toBeDefined();
    expect(typeof completeRes.body.assessment.overallScore).toBe('number');
    expect(Number.isFinite(completeRes.body.assessment.overallScore)).toBe(true);
    expect(completeRes.body.assessment.overallScore).toBeGreaterThanOrEqual(0);
    expect(completeRes.body.assessment.overallScore).toBeLessThanOrEqual(100);
    expect(['distinction', 'credit', 'pass', 'fail']).toContain(completeRes.body.assessment.grade);

    expect(Array.isArray(completeRes.body.defects)).toBe(true);
    expect(completeRes.body.feedback).toBeDefined();
    expect(completeRes.body.feedback.aiFeedbackSummary).toBeTruthy();
    expect(Array.isArray(completeRes.body.competencies)).toBe(true);
    expect(completeRes.body.competencies.length).toBeGreaterThan(0);

    // 5. Verify all sub-scores are finite
    const subScores = completeRes.body.assessment.subScores || completeRes.body.assessment;
    [
      'speedAccuracy', 'beadQuality', 'fusionQuality',
      'penetration', 'alignment', 'consistency', 'processControl',
    ].forEach((key) => {
      expect(Number.isFinite(subScores[key])).toBe(true);
    });
  }, 30000);
});
