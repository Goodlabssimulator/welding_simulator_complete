/**
 * Application Constants
 */

// API Base URL
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws';

// Welding Types
export const WELD_TYPES = {
  SMAW: 'SMAW',
  GMAW: 'GMAW',
  GTAW: 'GTAW',
  FCAW: 'FCAW',
};

// Joint Types
export const JOINT_TYPES = {
  BUTT: 'butt',
  FILLET: 'fillet',
  LAP: 'lap',
  TEE: 'tee',
  CORNER: 'corner',
  EDGE: 'edge',
};

// Positions
export const WELD_POSITIONS = {
  FLAT: '1G',
  HORIZONTAL: '2G',
  VERTICAL_UP: '3G',
  VERTICAL_DOWN: '3G_down',
  OVERHEAD: '4G',
};

// Material Types
export const MATERIALS = {
  MILD_STEEL: 'mild_steel',
  STAINLESS_STEEL: 'stainless_steel',
  ALUMINUM: 'aluminum',
  CAST_IRON: 'cast_iron',
};

// Default welding parameter ranges per type
export const PARAM_RANGES = {
  SMAW: {
    current: { min: 60, max: 200, default: 120, step: 5, unit: 'A' },
    voltage: { min: 18, max: 32, default: 24, step: 1, unit: 'V' },
    speed: { min: 1, max: 10, default: 4, step: 0.5, unit: 'mm/s' },
    electrodeAngle: { min: 5, max: 30, default: 15, step: 1, unit: '°' },
    workAngle: { min: 0, max: 45, default: 0, step: 1, unit: '°' },
  },
  GMAW: {
    current: { min: 80, max: 300, default: 160, step: 5, unit: 'A' },
    voltage: { min: 16, max: 28, default: 22, step: 0.5, unit: 'V' },
    speed: { min: 2, max: 12, default: 5, step: 0.5, unit: 'mm/s' },
    wireFeedSpeed: { min: 2, max: 15, default: 6, step: 0.5, unit: 'm/min' },
    gasFlow: { min: 10, max: 30, default: 18, step: 1, unit: 'L/min' },
  },
  GTAW: {
    current: { min: 30, max: 250, default: 100, step: 5, unit: 'A' },
    voltage: { min: 10, max: 20, default: 14, step: 0.5, unit: 'V' },
    speed: { min: 1, max: 6, default: 2.5, step: 0.5, unit: 'mm/s' },
    gasFlow: { min: 8, max: 25, default: 12, step: 1, unit: 'L/min' },
  },
};

// Default parameters for the welding workspace
export const DEFAULT_PARAMS = {
  current: PARAM_RANGES.SMAW.current.default,
  voltage: PARAM_RANGES.SMAW.voltage.default,
  speed: PARAM_RANGES.SMAW.speed.default,
  electrodeAngle: PARAM_RANGES.SMAW.electrodeAngle.default,
  workAngle: PARAM_RANGES.SMAW.workAngle.default,
};


// Assessment sub-scores
export const SUB_SCORES = [
  { key: 'bead_appearance', label: 'Bead Appearance', icon: '🎨' },
  { key: 'penetration', label: 'Penetration', icon: '⬇️' },
  { key: 'path_accuracy', label: 'Path Accuracy', icon: '🎯' },
  { key: 'speed_consistency', label: 'Speed Consistency', icon: '⚡' },
  { key: 'angle_consistency', label: 'Angle Consistency', icon: '📐' },
  { key: 'heat_management', label: 'Heat Management', icon: '🔥' },
  { key: 'overall_quality', label: 'Overall Quality', icon: '✨' },
];

// Grade thresholds
export const GRADES = {
  DISTINCTION: { min: 80, label: 'Distinction', color: '#4caf50' },
  CREDIT: { min: 65, label: 'Credit', color: '#00b0ff' },
  PASS: { min: 50, label: 'Pass', color: '#ff9800' },
  FAIL: { min: 0, label: 'Fail', color: '#f44336' },
};

// Competency levels
export const COMPETENCY_LEVELS = {
  COMPETENT: { min: 65, label: 'Competent', class: 'competent' },
  DEVELOPING: { min: 45, label: 'Developing', class: 'developing' },
  NOT_YET_COMPETENT: { min: 0, label: 'Not Yet Competent', class: 'not_yet_competent' },
};

// Defect types
export const DEFECT_TYPES = {
  porosity: { label: 'Porosity', icon: '🫧', description: 'Gas pockets trapped in the weld metal' },
  undercut: { label: 'Undercut', icon: '🔻', description: 'Groove melted into base metal at the toe' },
  lack_of_fusion: { label: 'Lack of Fusion', icon: '💔', description: 'Incomplete bonding between weld and base metal' },
  lack_of_penetration: { label: 'Lack of Penetration', icon: '⬇️', description: 'Insufficient depth of weld metal into the joint' },
  burn_through: { label: 'Burn Through', icon: '🔥', description: 'Excessive melt-through creating a hole' },
  slag_inclusion: { label: 'Slag Inclusion', icon: '🪨', description: 'Non-metallic material trapped in the weld' },
  cracking: { label: 'Cracking', icon: '⚡', description: 'Fractures in the weld metal or HAZ' },
  spatter: { label: 'Spatter', icon: '💧', description: 'Metal droplets expelled from the weld pool' },
  overlap: { label: 'Overlap', icon: '↪️', description: 'Weld metal flowing over base metal surface without fusion' },
  distortion: { label: 'Distortion', icon: '↔️', description: 'Unwanted change in shape due to thermal stress' },
};

// Roles
export const ROLES = {
  STUDENT: 'student',
  TRAINER: 'trainer',
  ADMIN: 'admin',
};
export const USER_ROLES = ROLES;


// Telemetry sample rate (ms)
export const TELEMETRY_SAMPLE_RATE = 100;

// Canvas dimensions
export const CANVAS = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 400,
  PLATE_COLOR: '#5c5c5c',
  JOINT_LINE_COLOR: '#2a2a2a',
  BEAD_COLOR: '#c87533',
  ARC_COLOR: '#64b5f6',
  SPARK_COLOR: '#fff176',
};
