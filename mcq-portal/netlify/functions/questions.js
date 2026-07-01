const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');
const { requireAdmin, jsonResponse } = require('./_shared/auth');

const STORE_NAME = 'exam-data';
const KEY = 'questions';

function store() {
  return getStore({ name: STORE_NAME });
}

async function getAllQuestions() {
  const data = await store().get(KEY, { type: 'json' });
  return Array.isArray(data) ? data : [];
}

async function saveAllQuestions(questions) {
  await store().setJSON(KEY, questions);
}

// Basic shape validation for a question object coming from the admin form.
function validateQuestion(q) {
  if (!q || typeof q !== 'object') return 'Question must be an object';
  if (typeof q.question !== 'string' || !q.question.trim()) return 'Question text is required';
  if (!Array.isArray(q.options) || q.options.length < 2) return 'At least 2 options are required';
  if (q.options.some((o) => typeof o !== 'string' || !o.trim())) return 'Options must be non-empty strings';
  if (typeof q.answer !== 'string' || !q.answer.trim()) return 'A correct answer is required';
  if (!q.options.includes(q.answer)) return 'The correct answer must match one of the options exactly';
  if (q.image !== undefined && typeof q.image !== 'string') return 'Image must be a URL string';
  if (q.imageCaption !== undefined && typeof q.imageCaption !== 'string') return 'Image caption must be a string';
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});

  // ---- READ: public, so the exam page itself can load questions ----
  if (event.httpMethod === 'GET') {
    try {
      const questions = await getAllQuestions();
      return jsonResponse(200, questions);
    } catch (err) {
      return jsonResponse(500, { error: 'Failed to load questions', detail: err.message });
    }
  }

  // ---- Everything below modifies data, so it requires a valid admin session ----
  const admin = requireAdmin(event);
  if (!admin) {
    return jsonResponse(401, { error: 'Unauthorized. Please log in again.' });
  }

  try {
    const questions = await getAllQuestions();

    // ---- CREATE ----
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const validationError = validateQuestion(body);
      if (validationError) return jsonResponse(400, { error: validationError });

      const newQuestion = {
        id: crypto.randomUUID(),
        question: body.question.trim(),
        options: body.options.map((o) => o.trim()),
        answer: body.answer.trim(),
        ...(body.image ? { image: body.image.trim() } : {}),
        ...(body.imageCaption ? { imageCaption: body.imageCaption.trim() } : {}),
      };
      questions.push(newQuestion);
      await saveAllQuestions(questions);
      return jsonResponse(201, newQuestion);
    }

    // ---- UPDATE ----
    if (event.httpMethod === 'PUT') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return jsonResponse(400, { error: 'Missing question id' });

      const body = JSON.parse(event.body || '{}');
      const validationError = validateQuestion(body);
      if (validationError) return jsonResponse(400, { error: validationError });

      const idx = questions.findIndex((q) => q.id === id);
      if (idx === -1) return jsonResponse(404, { error: 'Question not found' });

      questions[idx] = {
        ...questions[idx],
        question: body.question.trim(),
        options: body.options.map((o) => o.trim()),
        answer: body.answer.trim(),
        image: body.image ? body.image.trim() : undefined,
        imageCaption: body.imageCaption ? body.imageCaption.trim() : undefined,
      };
      // Clean up undefined keys so they don't get serialized
      Object.keys(questions[idx]).forEach((k) => questions[idx][k] === undefined && delete questions[idx][k]);

      await saveAllQuestions(questions);
      return jsonResponse(200, questions[idx]);
    }

    // ---- DELETE ----
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return jsonResponse(400, { error: 'Missing question id' });

      const idx = questions.findIndex((q) => q.id === id);
      if (idx === -1) return jsonResponse(404, { error: 'Question not found' });

      const [removed] = questions.splice(idx, 1);
      await saveAllQuestions(questions);
      return jsonResponse(200, removed);
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    return jsonResponse(500, { error: 'Something went wrong', detail: err.message });
  }
};
