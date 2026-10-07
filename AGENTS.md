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

- Keep unavailable checkout choices in a client-side selection helper and never update plan status from pricing UI, because payment has no verified provider yet.
- Keep each content route responsible for its own metadata so public and private pages have distinct titles.
- Treat `subscriptions` as the only billing status source; pricing controls only remember a future checkout choice because no provider is connected.
