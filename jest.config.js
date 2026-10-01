/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    moduleFileExtensions: ['ts', 'js'],
    moduleNameMapper: { '^@src/(.*)$': '<rootDir>/src/$1' },
    testMatch: ['**/?(*.)+(spec|test).ts'],
    // Playwright owns e2e/*.spec.ts
    testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.next'],
}
