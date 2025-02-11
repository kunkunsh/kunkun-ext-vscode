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
	TemplateUiCommand
} from "@kksh/api/ui/template"
import { array, boolean, flatten, object, safeParse, string, type InferOutput } from "valibot"

const Project = object({
	enabled: boolean(),
	name: string(),
	paths: array(string()),
	rootPath: string(),
	tags: array(string())
})
type Project = InferOutput<typeof Project>
const Projects = array(Project)
type Projects = InferOutput<typeof Projects>

function mapProjectToItem(project: Project): List.Item {
	return new List.Item({
		title: project.name,
		subTitle: project.rootPath,
		value: project.rootPath,
		icon: new Icon({ type: IconEnum.Iconify, value: "ri:folder-open-fill" })
	})
}

function openWithVSCode(path: string) {
	return shell
		.hasCommand("code")
		.then((hasCommand) => {
			if (!hasCommand) {
				return toast.error(
					"code command not installed to PATH, please install it the 'code' command."
				)
			} else {
				return shell
					.createCommand("code", [path])
					.execute()
					.then((res) => {
						toast.success(`Opened with VSCode`)
					})
					.catch((err) => {
						toast.error(`Failed to open with VSCode: ${err}`)
					})
			}
		})
		.catch((err) => {
			toast.error(`${err}`)
		})
}

class VSCodeProjectManager extends TemplateUiCommand {
	async load() {
		ui.render(new List.List({ items: [] }))
		const platform = await os.platform()
		let fileContent: string | undefined
		if (platform === "macos") {
			fileContent = await fs.readTextFile(
				"Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json",
				{ baseDir: path.BaseDirectory.Home }
			)
		} else if (platform === "windows") {
			fileContent = await fs.readTextFile(
				"Code/User/globalStorage/alefragnani.project-manager/projects.json",
				{ baseDir: path.BaseDirectory.AppData }
			)
		} else if (platform === "linux") {
			fileContent = await fs.readTextFile(
				".config/Code/User/globalStorage/alefragnani.project-manager/projects.json",
				{ baseDir: path.BaseDirectory.Home }
			)
		} else {
			return toast.error(`Unsupported platform: ${platform}`).then(() => Promise.resolve())
		}
		if (!fileContent) {
			return toast
				.error(`Failed to read Project Manager configuration file`)
				.then(() => Promise.resolve())
		}
		const parseRes = safeParse(Projects, JSON.parse(fileContent))
		if (!parseRes.success) {
			return toast
				.error(`Failed to parse projects file: ${flatten<typeof Projects>(parseRes.issues)}`)
				.then(() => Promise.resolve())
		}
		const projects = parseRes.output

		const tags = projects.map((project) => project.tags).flat()
		const sections = tags.map((tag) => {
			return new List.Section({
				title: tag,
				items: projects.filter((project) => project.tags.includes(tag)).map(mapProjectToItem)
			})
		})
		sections.push(
			new List.Section({
				title: "[no tags]",
				items: projects.filter((project) => project.tags.length === 0).map(mapProjectToItem)
			})
		)

		return ui.setSearchBarPlaceholder("Search for projects...").then(() => {
			return ui.render(new List.List({ sections }))
		})
	}

	onSearchTermChange(term: string): Promise<void> {
		return Promise.resolve()
	}

	async onListItemSelected(value: string): Promise<void> {
		log.info(`Selected project: ${value}`)
		const platform = await os.platform()
		if (platform === "macos") {
			openWithVSCode(value)
			//   shell.Command.create("code", [value]).execute();
			// shell.executeBashScript(`open -a "Visual Studio Code" "${value}"`)
		} else if (platform === "windows") {
			openWithVSCode(value)
		} else if (platform === "linux") {
			openWithVSCode(value)
		} else {
			toast.error(`Unsupported platform: ${platform}).then(() => Promise.resolve()`)
		}
	}
}

expose(new VSCodeProjectManager())
