<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product conventions

- 2026-10-31 latest: retire the choice quiz and category city on both applicable surfaces; remove their navigation and exclusive implementation, including Three.js. Preserve the independent `/options` directory and its shared polygon primitive, now owned by `components/option-geometry.ts` and `option-scene.module.css`. `/choose` redirects to `/today`; `/city` redirects to `/posts`. Article category/tag filtering and account records remain. These requirements supersede earlier instructions to keep the retired experiences.

- Features explicitly called `option` / `options` by the user must reuse the 选境 (Choice Field) polygon regions, color surfaces, typography, hover/focus feedback, entry and click bloom animations, keyboard navigation, and reduced-motion behavior. Use `src/components/option-field.tsx` and the shared Choice Field styles/geometry, rather than inventing an unrelated option-card design.
- The user confirmed on 2026-10-04 that ongoing feature development modifies only the mini-program (P01 in `../docs/decisions.md`). Do not develop the web version first or synchronize web features by default. These web conventions apply when the user explicitly includes web changes in a later task.
- Option color regions must cover the entire viewport (`inset: 0`). Titles, navigation, direct-choice buttons and live recommendations float above the regions; do not reserve empty header/footer bands by shrinking the board.
- Every shared option header includes Choice Field-style progress. Up to 10 steps: one segment per step, completed segments lit and the current step highlighted separately. More than 10 steps: exactly 10 segments, each lit only after another full 10% is completed. Pass actual completed/total counts; navigation-only options default to a single pending choice. Never infer progress from the number of options or the color/animation stage.
- Progress segments navigate to reachable steps; percentage segments target the start of their 10% interval (rounded up to an actual step). Choice flows have subtle previous/next chevrons at the viewport edges. Retain visited answers/snapshots when navigating; changing an answer invalidates dependent later history, and unchanged answers preserve it. Never create a saved result just by navigating. Disable unreachable steps and navigation during a choice transition.
- Previous/next controls sit at the vertical midpoint of the viewport's left and right edges, outside the top floating header. Use tall, narrow chevrons with a 1.7 stroke, subtle hover/focus brightening and outward movement. Keep safe-area margins and a usable touch target. Reduced-motion users retain color feedback without movement.
- The web food comparison, question catalog and meal games were retired on 2026-10-22. Do not restore their UI or navigation; `/eat` and `/eat/legacy` redirect to `/meals`. Preserve the shared nutrition records, saved meal library and existing `dining` / `meals` backup compatibility without deleting or migrating stored data.
