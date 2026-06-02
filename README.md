# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Gemini integration

Submitting a prompt from this landing page opens `https://gemini.google.com/app?q=…` with your text in the query string. Google Gemini does not use that parameter on its own—you need a browser extension to read `?q=` and fill (and submit) the prompt on the Gemini page.

**Firefox:** Install [Gemini URL Search](https://addons.mozilla.org/en-US/firefox/addon/gemini-url-search/). Without it, you will reach Gemini but the prompt will not be applied automatically.

The extension’s [setup instructions](https://addons.mozilla.org/en-US/firefox/addon/gemini-url-search/) also describe an optional `@g` address-bar shortcut (`https://gemini.google.com/app?q=%s`). The landing page uses the same URL pattern, so you do not need `@g` when submitting from this site.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.14.0 create --template minimal --types ts --add prettier eslint --install pnpm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
