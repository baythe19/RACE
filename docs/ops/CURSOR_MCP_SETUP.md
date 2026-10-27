# Cursor MCP reconnect list

> Saved 2026-10-20 from the Codespace that was running branch `changes-v6-partner-role-dispatch`.
> Use this on the next machine so the same tools can be connected again.
> **No secrets in this file.** API keys, OAuth tokens, and database URIs stay in Cursor settings or the provider dashboard.

## How to reconnect

1. Install Cursor and open this repo.
2. Cursor Settings → **Plugins**. Install the plugins in the table below.
3. The first time a plugin tool is used, complete its sign-in / OAuth prompt.
4. For Expo, also keep the user-level file below.
5. Restart Cursor, then start a new agent chat. The tools appear as MCP namespaces.

User-level file on this Codespace (`~/.cursor/mcp.json`), copied as a template only:

```json
{
  "mcpServers": {
    "expo": {
      "url": "https://mcp.expo.dev/mcp",
      "headers": {}
    }
  }
}
```

Plugin MCP servers are installed by the Cursor plugin, not by committing `mcp.json` into the repo.

## Connected in this session

These namespaces were available to the agent on 2026-10-20.

| Plugin / source | Namespace seen by the agent | Endpoint | Auth on a new machine |
|------------------|-----------------------------|----------|------------------------|
| Built-in | `cursor` | Cursor native tools (shell wait, lints, todos) | None. Comes with Cursor. |
| Built-in | `cursor-ide-browser` | Cursor browser tab | None. |
| Built-in | `cursor-computer-use` | Local desktop control | None. Only useful on a machine with a real desktop. |
| User `mcp.json` | `user-expo` | `https://mcp.expo.dev/mcp` | Expo account login when the tool asks. |
| GitHub plugin | `plugin-github-github` | `https://api.githubcopilot.com/mcp/` | GitHub login, or `GITHUB_PERSONAL_ACCESS_TOKEN` if you add the server by hand. |
| Figma plugin | `plugin-figma-figma` | `https://mcp.figma.com/mcp` | Figma OAuth. |
| Shopify plugin | `plugin-shopify-plugin-shopify` | `https://setup.shopify.com/mcp` | Shopify OAuth. |
| Render plugin | `plugin-render-render` | `https://mcp.render.com/mcp` | Render OAuth via the plugin. Manual alternative: API key from the Render dashboard as `Authorization: Bearer <key>`. |
| Vercel plugin | `plugin-vercel-vercel` | `https://mcp.vercel.com` | Vercel OAuth. |
| MongoDB plugin | `plugin-mongodb-mongodb` | local `npx -y mongodb-mcp-server@<3` | Connect inside the MongoDB plugin. Do not paste the Atlas URI into git. |

## Installed on this machine, not in the live agent catalog

These plugins were on disk. Install them on the next machine if you still want them. They were not part of the active tool list in this chat.

| Plugin | Endpoint | Notes |
|--------|----------|--------|
| Atlassian | `https://mcp.atlassian.com/v2/mcp` | Jira / Confluence OAuth. |
| Adspirer | `https://mcp.adspirer.com/mcp` | Ads MCP. Not used by RACE app code. |
| Grok Voice | no `mcp.json` | Skill pack only. No server to reconnect. |

## What each one is for on RACE

| Tool | Use it for |
|------|------------|
| Render | API service `race-api-w361`, logs, env, deploys. See `docs/ops/CLOUD_PRODUCTION_RUNBOOK.md`. |
| Vercel | Admin web `race-admin`. |
| Expo | EAS builds. Customer project `@webstarts/race-service`. Partner app owner in `mobile application/app.config.js` is `webstarts`. |
| MongoDB | Database `race-service` inspection. Read-only unless you mean to write. |
| GitHub | Issues, PRs, and the `changes-v6-partner-role-dispatch` branch. |
| Browser | Admin web and Peach pages. Partner mobile UI on this Codespace was driven with the **Peach CLI** (`~/.local/bin/peach`, Metro on port 8082), which is not an MCP. |
| Figma / Shopify | Installed and available. Not required to run the partner navigation flow. |

## Do not copy across machines

- `~/.cursor/mcp.json` header values, if you later add tokens
- Render, Vercel, GitHub, Expo, or MongoDB credentials
- `mobile application/.env` (gitignored). Use `.env.example` plus the dashboards.

Peach on a new Codespace is a separate install (`peach` CLI + `DISPLAY` / Xvfb). It is documented in `docs/DEVICE_FREE_PREVIEW.md`.
