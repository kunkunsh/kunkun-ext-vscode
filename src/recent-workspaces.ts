import {
  expose,
  fs,
  Icon,
  IconEnum,
  List,
  log,
  os,
  path,
  shell,
  toast,
  ui,
  TemplateUiCommand,
} from "@kksh/api/ui/template";
import {
  array,
  boolean,
  flatten,
  object,
  record,
  safeParse,
  string,
  type InferOutput,
} from "valibot";

const StorageSchema = object({
  profileAssociations: object({
    workspaces: record(string(), string()),
  }),
});
type Storage = InferOutput<typeof StorageSchema>;

function openWithVSCode(path: string) {
  return shell
    .hasCommand("code")
    .then((hasCommand) => {
      if (!hasCommand) {
        return toast.error(
          "code command not installed to PATH, please install it the 'code' command."
        );
      } else {
        return shell
          .createCommand("code", [path])
          .execute()
          .then((res) => {
            toast.success(`Opened with VSCode`);
          })
          .catch((err) => {
            toast.error(`Failed to open with VSCode: ${err}`);
          });
      }
    })
    .catch((err) => {
      toast.error(`${err}`);
    });
}

class VSCodeProjectManager extends TemplateUiCommand {
  async load() {
    ui.render(new List.List({ items: [] }));
    const platform = await os.platform();
    let fileContent: string | undefined;
    if (platform === "macos") {
      fileContent = await fs.readTextFile(
        "Library/Application Support/Code/User/globalStorage/storage.json",
        { baseDir: path.BaseDirectory.Home }
      );
    } else if (platform === "windows") {
      fileContent = await fs.readTextFile(
        "Code/User/globalStorage/storage.json",
        { baseDir: path.BaseDirectory.AppData }
      );
    } else if (platform === "linux") {
      fileContent = await fs.readTextFile(
        ".config/Code/User/globalStorage/storage.json",
        { baseDir: path.BaseDirectory.Home }
      );
    } else {
      return toast
        .error(`Unsupported platform: ${platform}`)
        .then(() => Promise.resolve());
    }
    if (!fileContent) {
      return toast
        .error(`Failed to read Project Manager configuration file`)
        .then(() => Promise.resolve());
    }
    let jsonContent: Storage | undefined;
    try {
      jsonContent = JSON.parse(fileContent);
    } catch (error) {
      return toast.error(
        `Failed to parse Project Manager configuration file: ${error}`
      );
    }
    const parseRes = safeParse(StorageSchema, JSON.parse(fileContent));
    if (!parseRes.success) {
      return toast.error(
        `Failed to parse Project Manager configuration file: ${flatten<
          typeof StorageSchema
        >(parseRes.issues)}`
      );
    }
    let workspaces = Object.keys(parseRes.output.profileAssociations.workspaces)
      .filter((w) => w.startsWith("file://"))
      .map((w) => w.slice(7));
    workspaces = (
      await Promise.all(
        workspaces.map(async (workspace) => ({
          workspace,
          exists: await fs.exists(workspace).catch((error) => {
            console.error(`Failed to check if ${workspace} exists:`, error);
            return false;
          }),
        }))
      )
    )
      .filter(({ exists }) => exists)
      .map(({ workspace }) => workspace);
    const folderNames = await Promise.all(
      workspaces.map(async (workspace) => await path.basename(workspace))
    );
    console.log(folderNames);
    const items = folderNames.map((name, idx) => {
      return new List.Item({
        title: name,
        subTitle: workspaces[idx],
        value: workspaces[idx],
        icon: new Icon({
          type: IconEnum.Iconify,
          value: "ri:folder-open-fill",
        }),
      });
    });
    return ui.setSearchBarPlaceholder("Search for projects...").then(() => {
      return ui.render(new List.List({ items }));
    });
  }

  onSearchTermChange(term: string): Promise<void> {
    return Promise.resolve();
  }

  async onListItemSelected(value: string): Promise<void> {
    log.info(`Selected project: ${value}`);
    const platform = await os.platform();
    if (platform === "macos") {
      openWithVSCode(value);
      //   shell.Command.create("code", [value]).execute();
      // shell.executeBashScript(`open -a "Visual Studio Code" "${value}"`)
    } else if (platform === "windows") {
      openWithVSCode(value);
    } else if (platform === "linux") {
      openWithVSCode(value);
    } else {
      toast.error(
        `Unsupported platform: ${platform}).then(() => Promise.resolve()`
      );
    }
  }
}

expose(new VSCodeProjectManager());
