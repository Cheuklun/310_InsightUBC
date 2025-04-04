import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightResult,
	InsightError,
	NotFoundError,
} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs";
import Dataset from "./Dataset";
import DatasetHandler from "./DatasetHandler";
import QueryEngine from "./QueryEngine";
import * as path from "path";
import TableTraversal from "./TableTraversal";
import Section from "./Section";
import Room from "./Room";

export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Dataset> = new Map<string, Dataset>();
	private dir = "./data";
	private datasetHandler = new DatasetHandler();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.accessDir();
		if (!this.validateId(id)) {
			throw new InsightError("Not a valid ID");
		}
		return await this.handleDatasetKind(id, content, kind);
	}

	private async accessDir(): Promise<void> {
		try {
			await fs.promises.access(this.dir);
		} catch (_err) {
			await fs.promises.mkdir(this.dir, { recursive: true });
		}
	}

	private async handleDatasetKind(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			if ((await this.datasetHandler.isThereDatasetDir(id)) || this.datasets.has(id)) {
				throw new InsightError("Dataset ID already exists.");
			}
			const zip = await JSZip.loadAsync(content, { base64: true });
			const currDataset = new Dataset();
			currDataset.setIDStr(id);
			if (kind === InsightDatasetKind.Sections) {
				await this.processSectionsDataset(currDataset, zip);
			} else if (kind === InsightDatasetKind.Rooms) {
				await this.processRoomsDataset(currDataset, zip);
			}
			if (!currDataset.getValid()) {
				throw new InsightError("Invalid Dataset");
			}
			await this.datasetHandler.addDatasetToDisk(currDataset);
			this.datasets.set(currDataset.getIDStr(), currDataset);
			return Array.from(this.datasets.keys());
		} catch (err) {
			throw new InsightError("Invalid Content" + err);
		}
	}

	private async processSectionsDataset(dataset: Dataset, zip: JSZip): Promise<void> {
		dataset.setKind(InsightDatasetKind.Sections);
		await this.datasetHandler.handleSectionsZip(
			zip,
			(_reason?: any) => {
				throw new InsightError(_reason);
			},
			dataset
		);
	}

	private async processRoomsDataset(dataset: Dataset, zip: JSZip): Promise<void> {
		dataset.setKind(InsightDatasetKind.Rooms);
		this.datasetHandler.tableTraversal = new TableTraversal();
		this.datasetHandler.building = [];
		await this.datasetHandler.handleRoomsZip(
			zip,
			(_reason?: any) => {
				throw new InsightError(_reason);
			},
			dataset
		);
	}

	private validateId(id: string): boolean {
		return id.trim() !== "" && /^[^\s_]+(\s+[^\s_]+)*$/.test(id);
	}

	private extractDatasetIdFromQuery(qObj: any): string {
		const columns = qObj.OPTIONS.COLUMNS;
		let datasetId: string | null = null;
		for (const col of columns) {
			if (typeof col !== "string") {
				throw new InsightError("Invalid column name");
			}
			if (!col.includes("_")) {
				continue;
			}
			const parts = col.split("_");
			if (parts.length < 2) {
				throw new InsightError("Invalid column key" + col);
			}
			if (datasetId === null) {
				datasetId = parts[0];
			} else if (datasetId !== parts[0]) {
				throw new InsightError("Query references multiple datasets");
			}
		}
		if (!datasetId) {
			throw new InsightError("Could not determine dataset from query");
		}
		return datasetId;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		this.validateQueryObject(query);
		const qObj = query as any;
		const datasetId = this.extractDatasetIdFromQuery(qObj);
		await this.ensureDatasetLoaded(datasetId);
		const dataset = this.datasets.get(datasetId);
		if (!dataset) {
			throw new InsightError("Dataset not found: " + datasetId);
		}
		const data = dataset.getKind() === InsightDatasetKind.Rooms ? dataset.getRooms() : dataset.getValidSections();
		const engine = new QueryEngine(data);
		return engine.performQuery(query);
	}

	private validateQueryObject(query: unknown): void {
		if (typeof query !== "object" || query === null) {
			throw new InsightError("Query must be an object");
		}
		const qObj = query as any;
		if (!qObj.OPTIONS?.COLUMNS) {
			throw new InsightError("Query missing OPTIONS.COLUMNS");
		}
		if (!Array.isArray(qObj.OPTIONS.COLUMNS) || qObj.OPTIONS.COLUMNS.length === 0) {
			throw new InsightError("OPTIONS.COLUMNS must be a non-empty array");
		}
	}

	private async ensureDatasetLoaded(datasetId: string): Promise<void> {
		if (!this.datasets.has(datasetId)) {
			const datasetPath = this.datasetHandler.getDatasetDirPath(datasetId);
			try {
				const loadedDataset = await this.loadDatasetFromDisk(datasetId, datasetPath);
				this.datasets.set(datasetId, loadedDataset);
			} catch (_err) {
				throw new InsightError("Dataset not found: " + datasetId);
			}
		}
	}

	private async loadDatasetFromDisk(datasetId: string, datasetPath: string): Promise<Dataset> {
		const content = await fs.promises.readFile(datasetPath, "utf8");
		const parsed = JSON.parse(content);
		const loadedDataset = new Dataset();
		loadedDataset.setIDStr(parsed.id);
		loadedDataset.setKind(parsed.kind);
		loadedDataset.setValid(parsed.isValid);
		this.loadSections(parsed.validSections, loadedDataset);
		this.loadRooms(parsed.validRooms, loadedDataset);
		return loadedDataset;
	}

	private loadSections(sections: any[], dataset: Dataset): void {
		sections.forEach((sec: any) => {
			const section = new Section(
				sec.uuid,
				sec.id,
				sec.title,
				sec.instructor,
				sec.dept,
				sec.year,
				sec.avg,
				sec.pass,
				sec.fail,
				sec.audit
			);
			dataset.addValidSection(section);
		});
	}

	private loadRooms(rooms: any[], dataset: Dataset): void {
		rooms.forEach((r: any) => {
			const room = new Room(
				r.name,
				r.fullname,
				r.shortname,
				r.number,
				r.address,
				r.seats,
				r.type,
				r.furniture,
				r.href,
				r.lat,
				r.lon
			);
			dataset.addValidRoom(room);
		});
	}

	public async removeDataset(id: string): Promise<string> {
		if (!this.validateId(id)) {
			throw new InsightError("Not a valid ID");
		}
		const exists = await this.datasetHandler.isThereDatasetDir(id);
		if (!exists) {
			throw new NotFoundError("Dataset does not exist");
		}
		this.datasets.delete(id);
		try {
			await fs.promises.unlink(this.datasetHandler.getDatasetDirPath(id));
			return id;
		} catch (_err) {
			throw new InsightError("Error while removing file");
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.accessDir();
		let files: string[];
		try {
			files = await fs.promises.readdir(this.dir);
		} catch (_err) {
			throw new InsightError("Error reading data directory");
		}
		const datasetPromises = files.map(async (file) => {
			try {
				const filePath = path.join(this.dir, file);
				const content = await fs.promises.readFile(filePath, "utf8");
				const parsed = JSON.parse(content);
				return {
					id: parsed.id || file,
					kind: parsed.kind,
					numRows: parsed.validSections ? parsed.validSections.length : 0,
				};
			} catch (_err) {
				return null;
			}
		});
		const datasets = await Promise.all(datasetPromises);
		return datasets.filter((d) => d !== null) as InsightDataset[];
	}
}
