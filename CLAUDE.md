# HoloAI

pnpm workspace monorepo (`backend/`). Node >=24.14, pnpm ^11.

## Verification

- **Never start the server** (no `pnpm start`, `pnpm dev:b`, `pm2`, or `node backend/dist/src/main.js`).
- To verify changes, run these from the repo root:
    - `pnpm run lint`
    - `pnpm run format`
    - `pnpm run build`

## Code style

- Group variable declarations together, at the top of the function where possible.
- Leave a blank line after variable declarations, before the next block of code.
- Separate each `if` statement from surrounding code with a blank line.
- Similar function calls may be grouped together; otherwise separate calls with a blank line.
- Prefer `if`/`else` over ternary operators. Use a ternary only when assigning a constant.
- Never use `void` function calls (e.g. `void doSomething()`).
- Avoid `try`/`catch` blocks where possible.
- Never use inline `await` expressions such as `await (func())()`; assign intermediate results to variables first.
- Always leave a blank line before a `return` statement.
