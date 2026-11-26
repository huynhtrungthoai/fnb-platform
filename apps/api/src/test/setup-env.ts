import 'reflect-metadata';

import { applyTestEnv } from './test-env.js';

// Runs in every test worker before the test file loads: the app then reads the test
// database and the test Redis from the environment.
applyTestEnv();
