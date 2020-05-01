module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        "@typescript-eslint/no-unused-vars": "error",
        '@typescript-eslint/interface-name-prefix': [2, { 'prefixWithI': 'always' }],
        'comma-dangle': [
            2,
            {
                arrays: 'never',
                objects: 'never',
                imports: 'never',
                exports: 'never',
                functions: 'never'
            }
        ],
        "@typescript-eslint/explicit-function-return-type": "off"
    }
};