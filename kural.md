# CONVENTIONS.md

## General Rules
- Write clean, modular, and testable code.
- Always use strict TypeScript settings.
- Avoid using 'any' type. Define proper interfaces.

## Architecture
- Use functional components and React Hooks for UI.
- Use early returns to avoid deep nesting.
- Name variables and functions descriptively (e.g., 'getUserById' instead of 'get').

## Error Handling
- Throw custom errors with descriptive messages.
- Always handle async operations with try/catch blocks.
