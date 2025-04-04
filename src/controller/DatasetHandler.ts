import Dataset from "./Dataset";
import { InsightError } from "./IInsightFacade";
import path from "node:path";
import Section from "./Section";
import JSZip from "jszip";
import TableTraversal, { BldInfo } from "./TableTraversal";
import { parse, defaultTreeAdapter } from "parse5";

const promisesFs = require("fs").promises;

export default class DatasetHandler {
	private dir = "./data";
	private year = 1900;
	public building: BldInfo[] = [];
	public tableTraversal: TableTraversal = new TableTraversal();

	public async addDatasetToDisk(dataset: Dataset): Promise<void> {
		const jsonString = JSON.stringify(dataset, null, "\t");
		const nPath = this.getDatasetDirPath(dataset.getIDStr());
		try {
			await this.saveToDataDir(nPath, jsonString);
		} catch (_err) {
			throw new InsightError("Error when saving to disk");
		}
	}

	public getDatasetDirPath(id: string): string {
		return path.join(this.dir, `${id}`);
	}

	public async isThereDatasetDir(id: string): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const filePath = this.getDatasetDirPath(id);
			promisesFs
				.access(filePath)
				.then(() => {
					resolve(true);
				})
				.catch(() => {
					resolve(false);
				});
		});
	}

	public async saveToDataDir(nPath: string, jsonString: string): Promise<void> {
		try {
			await promisesFs.writeFile(nPath, jsonString);
		} catch (_err) {
			throw new InsightError("Error when writing to disk");
		}
	}

	private createSection(object: any): Section {
		const currentSection = new Section(
			String(object.id),
			object.Course,
			object.Title,
			object.Professor,
			object.Subject,
			object.Section === "overall" ? this.year : Number(object.Year),
			object.Avg,
			object.Pass,
			object.Fail,
			object.Audit
		);

		if (this.isAValidSection(currentSection)) {
			return currentSection;
		} else {
			return new Section("invalid", "", "", "", "", 0, 0, 0, 0, 0);
		}
	}

	private isAValidSection(section: Section): boolean {
		return !(
			section.getSectionID() === undefined ||
			section.getCourseID() === undefined ||
			section.getTitle() === undefined ||
			section.getInstructor() === undefined ||
			section.getDepartment() === undefined ||
			section.getYear() === undefined ||
			section.getAvg() === undefined ||
			section.getPass() === undefined ||
			section.getFail() === undefined ||
			section.getAudit() === undefined
		);
	}

	public async handleSectionsZip(zip: JSZip, reject: (reason?: any) => void, dataset: Dataset): Promise<void> {
		const promises: unknown[] = [];
		let coursesFolderEx = false;
		zip.forEach((relativePath: string, zipEntry: JSZip.JSZipObject) => {
			if (relativePath.startsWith("courses") && !relativePath.includes("courses/.") && !relativePath.endsWith("/")) {
				coursesFolderEx = true;
				promises.push(
					zipEntry
						.async("string")
						.then((contentInFile) => {
							const parsedCourseFromJSON = JSON.parse(contentInFile);
							const result = parsedCourseFromJSON.result;
							if (result.length !== 0) {
								// all JSON objects in file
								for (const object of result) {
									const newSec = this.createSection(object);
									if (!(newSec.getCourseID() === "invalid")) {
										dataset.setValid(true);
										dataset.addValidSection(newSec);
									}
								}
							}
						})
						.catch((_err) => {
							reject(new InsightError("Error while adding dataset"));
						})
				);
			}
		});
		await Promise.all(promises);

		if (!coursesFolderEx) {
			throw new InsightError("Courses folder not found");
		}
	}

	// new chatgpt assisted
	public async handleRoomsZip(zip: JSZip, reject: (reason?: any) => void, dataset: Dataset): Promise<void> {
		const promises: unknown[] = [];
		let isIndexPresent = false;
		let hasRelevantFolders = false;

		this.processZipEntries(zip, promises, reject, (filePath, entry) => {
			if (filePath.endsWith("index.htm")) {
				isIndexPresent = true;
				this.parseIndexHTMLFile(entry, promises, reject);
			} else if (this.isRelevantFolder(filePath)) {
				hasRelevantFolders = true;
			}
		});

		await Promise.all(promises);
		this.processZipEntries(zip, promises, reject, (filePath, entry) => {
			if (this.isBuildingFile(filePath)) {
				this.processBuildingFile(filePath, entry, promises, reject, dataset);
			}
		});

		await Promise.all(promises);

		if (!isIndexPresent || !hasRelevantFolders) {
			throw new InsightError("Missing required files or folders in dataset");
		}
	}

	private processZipEntries(
		zip: JSZip,
		_promises: unknown[],
		_reject: (reason?: any) => void,
		entryProcessor: (path: string, entry: JSZip.JSZipObject) => void
	): void {
		zip.forEach((relativePath, zipEntry) => entryProcessor(relativePath, zipEntry));
	}

	private parseIndexHTMLFile(entry: JSZip.JSZipObject, promises: unknown[], reject: (reason?: any) => void): void {
		promises.push(
			entry
				.async("string")
				.then((content) => this.parseAndStoreBuildingInfo(content, reject))
				.catch(() => reject(new InsightError("Error reading index.htm")))
		);
	}

	private parseAndStoreBuildingInfo(content: string, reject: (reason?: any) => void): void {
		try {
			const document = parse(content, { treeAdapter: defaultTreeAdapter });
			this.building = this.tableTraversal.parseHTML(document);
		} catch {
			reject(new InsightError("Error parsing index.htm"));
		}
	}

	private isRelevantFolder(folderPath: string): boolean {
		return ["campus/", "campus/discover/", "campus/discover/buildings-and-classrooms/"].includes(folderPath);
	}

	private isBuildingFile(filePath: string): boolean {
		return filePath.startsWith("campus/discover/buildings-and-classrooms/") && filePath.endsWith(".htm");
	}

	private processBuildingFile(
		filePath: string,
		entry: JSZip.JSZipObject,
		promises: unknown[],
		reject: (reason?: any) => void,
		dataset: Dataset
	): void {
		for (const buildingInfo of this.building) {
			if (buildingInfo.link === filePath) {
				this.parseBuildingHTMLFile(entry, buildingInfo, promises, reject, dataset);
				break;
			}
		}
	}

	private parseBuildingHTMLFile(
		entry: JSZip.JSZipObject,
		buildingInfo: BldInfo,
		promises: unknown[],
		reject: (reason?: any) => void,
		dataset: Dataset
	): void {
		promises.push(
			entry
				.async("string")
				.then(async (content) => await this.parseAndStoreRoomInfo(content, buildingInfo, dataset, reject))
				.catch(() => reject(new InsightError("Error reading building file")))
		);
	}

	private async parseAndStoreRoomInfo(
		content: string,
		buildingInfo: BldInfo,
		dataset: Dataset,
		reject: (reason?: any) => void
	): Promise<void> {
		try {
			const document = parse(content, { treeAdapter: defaultTreeAdapter });
			await this.tableTraversal.processBldFile(document, dataset, buildingInfo);
			if (dataset.getRooms().length > 0) {
				dataset.setValid(true);
			}
		} catch {
			reject(new InsightError("Error parsing building file"));
		}
	}
}
