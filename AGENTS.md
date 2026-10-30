# Shared AI-agent instructions

## Translation workflow

- When adding or changing UI translations, add or update the English text in `packages/shared/src/i18n/translations.ts` during implementation.
- Do not update the other language JSON files during implementation unless the user explicitly asks for translations.
- Before creating a commit, update the corresponding entries in all supported language JSON files. If you cannot complete them, explain what remains and do not create the commit.
