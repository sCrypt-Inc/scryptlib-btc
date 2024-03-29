/* eslint-env node */
module.exports = {
    "env": {
        "browser": true,
        "node": true,
        "es2020": true
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {

        "@typescript-eslint/no-explicit-any": ["off"]
    },
    ignorePatterns: ["patches/**/*", "test/**/*"],
    root: true,
};