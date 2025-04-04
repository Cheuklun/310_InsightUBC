import Section from "./Section";
import { InsightDatasetKind } from "./IInsightFacade";
import Room from "./Room";

export default class Dataset {
	private idStr = "";
	private validSections: Section[] = [];
	private kind: InsightDatasetKind = InsightDatasetKind.Sections;
	private isValid = false;
	private validRooms: Room[] = [];

	public getIDStr(): string {
		return this.idStr;
	}

	public getKind(): InsightDatasetKind {
		return this.kind;
	}

	public setIDStr(id: string): void {
		this.idStr = id;
	}

	public setKind(datasetKind: InsightDatasetKind): void {
		this.kind = datasetKind;
	}

	public addValidSection(section: Section): void {
		this.validSections.push(section);
	}

	public getValidSections(): Section[] {
		return this.validSections;
	}

	public getValid(): boolean {
		return this.isValid;
	}

	public setValid(bool: boolean): void {
		this.isValid = bool;
	}

	public getRooms(): Room[] {
		return this.validRooms;
	}

	public addValidRoom(room: any): void {
		this.validRooms.push(room);
	}
}
