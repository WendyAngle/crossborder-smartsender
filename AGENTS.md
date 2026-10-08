<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep phone-card domain rules in a browser-safe module and the card UI in focused feature components, so physical-card and Profile rules are shared and testable.
- Keep unconnected phone-card operations explicitly simulated and session-scoped; do not report hardware or remote send success before a verified service integration exists.
- Reload provider and consumer modules together during context HMR and prebundle React entry points together, to avoid stale context identities and mixed React runtimes in the preview.
