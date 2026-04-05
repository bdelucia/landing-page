# Git Workflow & Commit Standards

## 1. Atomic Feature Commits

- **Logical Separation:** Do not bundle unrelated changes. Separate features into multiple smaller commits.
- **Scope by Page/Component:** If working on multiple pages or features, commit them individually.
- **Granularity:** Each commit should represent a single logical "unit of work."

## 2. Conventional Commit Format

All commit messages MUST follow this structure:
`{type}: {description}`

### Allowed Types:

- **feat**: A new feature (e.g., a new Svelte component or page)
- **fix**: A bug fix
- **chore**: Maintenance tasks (updating dependencies, config changes, file moves)
- **docs**: Documentation only changes (README, inline JSDoc)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting)

### Examples:

- `feat: add user profile page and avatar component`
- `chore: init sveltekit project and install tailwind`
- `fix: resolve hydration error on navbar`
- `docs: update deployment instructions`
