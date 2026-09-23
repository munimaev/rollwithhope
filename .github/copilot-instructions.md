# Project instructions

## Default behavior
- Prefer direct, minimal edits without asking for confirmation on safe and obvious changes.
- Do not interrupt with "keep"/"discard" style prompts for small, local code changes when the fix is clear and consistent with the project.
- Keep patches surgical: one root-cause fix, no unrelated churn.
- Preserve the current project architecture and naming patterns.
- Prefer edits that reuse existing components and styles before introducing new abstractions.
- Сохраняй цвет раздела: `preparation` — green, `play` — orange, `create` — purple, `enemies` — red, `campaigns` — blue. Gem в меню и элементы статьи используют общий `--dh-section-*` каскад через `data-section`; не добавляй локальные hardcoded-цвета или классы вида `.section--green`.
- Внешний вид статьи должен зависеть от активного раздела через `data-section`; цвет главы (`data-chapter`) отвечает только за уровень главы и не заменяет цвет раздела.

## Scope
- For Vue/Vite frontend work, favor componentized, readable code and keep existing app structure intact.
- Preserve behavior and styling unless the user explicitly asks for a redesign.
- When a task is clear, proceed without extra approval loops.

## Output style
- Keep changes concise and practical.
- Do not add unnecessary files or comments.
- Validate with the smallest relevant build/test command after the fix.
