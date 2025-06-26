module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json'
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended'
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/naming-convention': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/prefer-optional-chain': 'warn',
        '@typescript-eslint/no-unnecessary-condition': 'warn',
        '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
        '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
        '@typescript-eslint/prefer-includes': 'warn',
        '@typescript-eslint/no-array-constructor': 'warn',
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-inferrable-types': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/prefer-as-const': 'warn',
        '@typescript-eslint/prefer-readonly': 'warn',
        '@typescript-eslint/type-annotation-spacing': 'warn',
        'no-console': 'off',
        'no-debugger': 'warn',
        'no-duplicate-imports': 'warn',
        'no-unused-vars': 'off',
        'prefer-const': 'warn',
        'no-var': 'warn'
    },
    env: {
        node: true,
        es6: true
    },
    ignorePatterns: ['dist/', 'node_modules/', '*.js', '*.d.ts']
}; 