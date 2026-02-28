import express from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Judge0 CE — official free instance
const JUDGE0_URL = 'https://ce.judge0.com';

// Language name → Judge0 language ID
const LANGUAGE_MAP = {
    javascript: 63,  // Node.js
    python: 71,      // Python 3
    c: 50,           // C (GCC 9.2.0)
    cpp: 54,         // C++ (GCC 9.2.0)
    java: 62,        // Java (OpenJDK 13.0.1)
};

// Helper: submit code to Judge0 and wait for result
async function judge0Execute(code, languageId, stdin = '') {
    const response = await axios.post(
        `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
        {
            source_code: Buffer.from(code).toString('base64'),
            language_id: languageId,
            stdin: Buffer.from(stdin).toString('base64'),
            cpu_time_limit: 5,
            memory_limit: 128000
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        }
    );

    const result = response.data;

    // Decode base64 outputs
    const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '';
    const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '';
    const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '';

    return {
        stdout,
        stderr,
        compileOutput,
        status: result.status,
        time: result.time,
        memory: result.memory
    };
}

// Execute code
router.post('/execute', requireAuth, async (req, res) => {
    const { code, input } = req.body;
    const language = (req.body.language || 'javascript').toLowerCase();

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
        return res.json({ success: false, error: `Language "${language}" is not supported. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}` });
    }

    try {
        const result = await judge0Execute(code, languageId, input || '');

        if (result.status.id <= 3) {
            res.json({ success: true, output: result.stdout, time: result.time, memory: result.memory });
        } else if (result.status.id === 6) {
            res.json({ success: false, error: `Compilation Error:\n${result.compileOutput}` });
        } else if (result.status.id === 5) {
            res.json({ success: false, error: 'Execution timed out (5s limit).' });
        } else {
            res.json({ success: false, error: result.stderr || result.compileOutput || `Error: ${result.status.description}` });
        }
    } catch (err) {
        console.error('Judge0 execution error:', err.message);
        res.json({ success: false, error: `Execution service error: ${err.message}` });
    }
});

// Run code against test cases
router.post('/test', requireAuth, async (req, res) => {
    const { code, testCases } = req.body;
    const language = (req.body.language || 'javascript').toLowerCase();

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
        return res.json({ success: false, error: `Language "${language}" is not supported.` });
    }

    if (!testCases || testCases.length === 0) {
        return res.json({ success: true, results: [], passed: 0, total: 0 });
    }

    try {
        // Run all test cases in parallel
        const promises = testCases.map(tc => judge0Execute(code, languageId, tc.input || ''));
        const execResults = await Promise.all(promises);

        const results = execResults.map((result, idx) => {
            const actual = result.stdout.trim();
            const expected = (testCases[idx].expectedOutput || '').trim();
            const isError = result.status.id > 3;

            return {
                passed: !isError && actual === expected,
                input: testCases[idx].input,
                expected,
                actual: isError ? (result.stderr || result.compileOutput || result.status.description) : actual
            };
        });

        const passed = results.filter(r => r.passed).length;
        res.json({ success: true, results, passed, total: testCases.length });
    } catch (err) {
        console.error('Judge0 test error:', err.message);
        res.json({ success: false, error: `Execution service error: ${err.message}` });
    }
});

export default router;
