# MakeCode Simulator Extension Sample Project

This guide walks you through the process of developing a MakeCode simulator extension, from initial project creation to final release.

In the steps below, you will:

* **Set up for local MakeCode development**
* **Fork this repository and rename**
* **Develop your code extension in MakeCode**
* **Develop your simulator extension in VSCode**
* **Register your simulator extension**
* **Test your extension end to end**
* **Publish your simulator extension**
* **Submit your simulator extension for release**

> [!NOTE]
> The following instructions assume your extension targets microbit. If you're developing for a different target (e.g. Arcade), simply replace `pxt-microbit` with the appropriate repository name (e.g. `pxt-arcade`). All other steps remain the same.

### Set up for local MakeCode development

  Follow the instructions [here](https://github.com/microsoft/pxt-microbit#local-server-setup) to get setup for local MakeCode development, **with one important modification**: Because you will be creating a pull request to release or update your extension, **fork the target repo** rather than simply cloning it.

> [!IMPORTANT]
> Where the linked instructions say to clone the `pxt-microbit` repo, you will _clone your fork_ of the `pxt-microbit` repo.

#### Run local MakeCode server

  Ensure you can successfully host the MakeCode editor on localhost by following the [instructions here](https://github.com/microsoft/pxt-microbit#running). You should see MakeCode load in a browser, served from `http://localhost:3232`.

> [!TIP]
> You may have to restart the MakeCode local server occasionally. After running it once, the essential packages will have been built. To skip rebuilding them on subsequent runs, add the `--just` argument.
>
> Also, if you don't want `pxt serve` to open a new browser tab every time you start it, add the `--noBrowser` argument.
>
> ```bash
> pxt serve --just --noBrowser
> ```

### Fork and rename the `pxt-simx-sample` repository (this repo)

To create a new simulator extension, **fork this repo** to your organization's GitHub and **rename it** to fit your project.

  ![fork and rename repo](./assets/fork-sample-repo.png)

#### Configure GitHub Pages

Simulator extensions are hosted on GitHub Pages, so we'll set that up now.

1. Run the **Build Simulator Extension** GitHub Action. This will build and publish your _simx_ to a branch named `gh-pages`.

  ![build simx action](./assets/build-simx-action.png)

  Wait for the build to complete.

2. From your repo main page, click **Settings**, then **Pages** (under _Code and automation_). Beneath **Build and deployment**, in the **Branch** dropdown, choose the `gh-pages` branch, then click **Save**.

  ![deploy from the gh-pages branch](./assets/gh-pages-branch-deploy.png)

### Develop the code extension

The code portion of your extension is developed in the MakeCode editor. You need to import your GitHub project into MakeCode to allow syncing of changes.

#### Import repo to MakeCode

Import your newly cloned repo into MakeCode as a new project.

1. On the MakeCode home page, click the **Import** button:
  
  ![new project import repo](./assets/import-project-button.png)

2. Choose the **Import GitHub Repo** option. This will link your local project and the source repo, allowing MakeCode to sync changes from the editor.

  ![import github repo](./assets/import-github-url.png)

3. Once the project opens, it will be named 'pxt-simx-sample'. Go ahead and **rename your project**.

  ![rename and push](./assets/rename-and-push.png)

4. Update the message channel.

  The message channel is a unique string that identifies messages as belonging to your extension. It must be changed to to match your extension name.

  - Switch to the JavaScript editor
  - Expand the file explorer below the simulator
  - Open the `custom.ts` file
  - Update the value of SIMX_CHANNEL:

      ![simx channel](./assets/cod-ext-message-channel.png)

      Bonus: Update the namespace name as well. This will change the name of the category where your extension's blocks show up in the toolbox.

5. Push your changes to GitHub.

You are now set up to develop the code portion of your extension! See [this page](https://github.com/microsoft/pxt/blob/master/docs/extensions.md) for more information on extension development.


### Develop the simulator extension

As noted earlier, the simulator extension is a web application. As such, development is done using tools and workflows that will be familiar to many developers. To get started:

#### Clone your new repo

  Clone the repo to your local machine.

  On a command prompt:

  ```bash
  git clone https://github.com/your-org/my-extension
  ```

#### Install _simx_ dependencies

  On the same command prompt:

  ```bash
  cd my-extension/simx
  npm i
  ```

#### Open cloned folder in your preferred editor

These instructions will assume Visual Studio Code, but any editor will do.

Even though your changes in this repo will be scoped to the `simx` folder, go ahead and open the repo root in your editor.

#### Rename the webapp

Internally, the webapp will still be named "@your-org/my-extension". Open the file `simx/package.json` and update the name, then push your changes to GitHub.

#### Run the local dev server

On a command prompt open to the `simx` folder, start the dev server.

```bash
npm run dev
```

This command will begin hosting your _simx_ locally. Make note of the localhost URL and port number, as you'll need them to configure MakeCode to load the simulator from that address. For the purposes of this guide, we will assume the URL is `http://localhost:5173`.

### Register your extension with the pxt-microbit target

1. Open your cloned `pxt-microbit` folder in VSCode.

2. Open the file `targetconfig.json`.

3. Find the `approvedRepoLib` section.

4. At the end of this section, add an entry for your new extension:

    ```json
    "your-org/my-extension": {
      "simx": {
        "sha": "", // Leave this empty for now
        "devUrl": "http://localhost:5173"
      }
    }
    ```

5. For this configuration change to take effect, you must restart `pxt serve` and refresh your MakeCode tabs.

#### Edit your _simx_ webapp

The simulator extension webapp project is located in the `/simx` folder. During _simx_ development, you'll generally limit changes to files within this folder.

The `pxt-simx-sample/simx` webapp was created with [Vite](https://vitejs.dev) + [React](https://react.dev) + [TypeScript](https://typescriptlang.org). None of these frameworks are required. Use any framework you like, as long as the app is packaged as a static web application.

#### Update the Message Channel

In `/simx/src/App.tsx`, update `SIMX_CHANNEL` to match the value you set in the code extension.

While you're there, review comments marked with `🛠️ TASK`. These indicate areas you'll likely need to modify for your implementation.

### Test your extension in MakeCode

To test your extension end to end, you will create a new MakeCode project to integrate your code and simulator extensions.

1. Open the locally hosted MakeCode editor in second browser tab (`http://localhost:3232`), and create a new project.

2. Add your extension to the project from GitHub URL:

    Click the extensions toolbox category

    ![extensions toolbox category](./assets/extensions-btn.png)

    Enter your GitHub repo URL and press Enter

    ![extension github url](./assets/ext-github-url.png)

    Add your extension to the project

    ![extension load card](./assets/ext-load-card.png)

3. Instruct MakeCode to load your simulator extension from the local dev server by adding the `simxdev` URL parameter, e.g.:
    
    ```
    http://localhost:3232/index.html?simxdev#editor
    ```

> [!NOTE]
> This parameter only works run hosting MakeCode locally.

4. Once the page reloads, you should see your simulator extension load below the main simulator!


#### Refreshing the code extension

When you make changes to your code extension and push them to GitHub, you will need to pull those changes into your test project. This is done by refreshing the dependency in the File Explorer:

  ![refresh extension](./assets/refresh-ext.png)

> [!NOTE]
> The File Explorer is not accessible from the Blocks editor. Switch to JavaScript to find it.

#### Refreshing the simulator extension

When serving your _simx_ from the local dev server, your changes should reload automatically. No need to push anything to GitHub.

### Publishing your simulator extension

To test your _simx_ online or to release it, you must publish it to GitHub Pages.

1. Commit and push your changes to GitHub.

2. Run the **Build Simulator Extension** GitHub Action, which will publish your _simx_ to the `gh-pages` branch.

#### Test your published _simx_

3. Your published _simx_ is now publicly accessible at https://your-org.github.io/my-extension. Update `devUrl` in `targetconfig.json` to this value. Your updated registration will look something like:

    ```json
    "your-org/my-extension": {
      "simx": {
        "sha": "",
        "devUrl": "https://your-org.github.io/my-extension"
      }
    }
    ```

4. Restart `pxt serve` to pick up this config change.

5. In your MakeCode test project, refresh the page. Verify in devtools that your _simx_ is loading from github.io.


### Releasing your simulator extension

Simulator extension releases are pinned to GitHub commit SHA.

When ready to release your extension:

1. Go to the `gh-pages` branch on GitHub and copy the full commit SHA of the latest version.

    ![select gh-pages branch](./assets/select-ghpages-branch.png)

    ![commit history](./assets/commit-history.png)

    ![copy commit sha](./assets/copy-commit-sha.png)

2. Update the `sha` field of your extension registration in `targetconfig.json` with this value, so your updated registration looks something like this:

    ```json
    "your-org/my-extension": {
      "simx": {
        "sha": "6555401f995fac26ebafbaf1f1b1261ae72a05b3",
        "devUrl": "http://localhost:5173"
      }
    }
    ```

3. Open a pull request from your fork of `pxt-microbit` to `microsoft/pxt-microbit`.

The MakeCode team will review your extension and communicate a release timeline.
