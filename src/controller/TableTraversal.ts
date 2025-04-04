import { InsightError } from "./IInsightFacade";
import Dataset from "./Dataset";
import Room from "./Room";
import * as http from "http";

export interface BldInfo {
	buildingName: string;
	buildingCode: string;
	address: string;
	link: string;
}

export interface LatLon {
	lat: string;
	lon: string;
}

export default class TraverseTable {
	private bldRoomClassNames: string[] = [
		"views-field views-field-field-room-number",
		"views-field views-field-field-room-capacity",
		"views-field views-field-field-room-furniture",
		"views-field views-field-field-room-type",
		"views-field views-field-nothing",
	];

	private indexClassNames: string[] = [
		"views-field views-field-field-building-image",
		"views-field views-field-field-building-code",
		"views-field views-field-title",
		"views-field views-field-field-building-address",
		"views-field views-field-nothing",
	];
	private counter = 0;
	private two = 2;
	private link = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team233/";
	private linkedBldIndex: BldInfo[] = [];
	private indexTablePresent = false;
	private roomsTablePresent = false;

	public parseHTML(document: any): BldInfo[] {
		const table = this.traverseTableStructure(document, "table");
		if (this.indexTablePresent) {
			const tbody = this.processTableBody(table, "tbody");
			this.traversalHandler(tbody, "tr");
		} else {
			throw new InsightError("No valid table inside index.htm");
		}
		return this.linkedBldIndex;
	}

	private traverseTableStructure(node: any, tag: string): any {
		if (!node?.childNodes) {
			return null;
		}

		const len = node.childNodes.length;
		for (let i = 0; i < len; i++) {
			const child = node.childNodes[i];
			if (child.nodeName === tag && child.attrs[0].value === "views-table cols-5 table") {
				this.indexTablePresent = true;
				return child;
			}
			const result = this.traverseTableStructure(node.childNodes[i], tag);
			if (result) {
				return result;
			}
		}
		return null;
	}

	private traversalHandler(node: any, tag: string): any {
		if (!node?.childNodes) {
			return;
		}

		for (const tr of node.childNodes) {
			if (tr.nodeName !== tag) {
				continue;
			}

			const { hasAllElement, buildingInfo } = this.getBldData(tr);
			if (hasAllElement) {
				this.linkedBldIndex.push(buildingInfo);
			}

			this.traversalHandler(tr, tag);
		}
		return;
	}

	private getBldData(row: any): { hasAllElement: boolean; buildingInfo: BldInfo } {
		let hasAllElement = true;
		let buildingName = "",
			buildingCode = "",
			buildingAddress = "",
			buildingLink = "";

		for (const td of row.childNodes || []) {
			const value = td.attrs?.[0]?.value;
			if (td.nodeName === "td" && this.indexClassNames.includes(value)) {
				({ hasAllElement, buildingName, buildingCode, buildingAddress, buildingLink } = this.traverseTableCell(
					value,
					td,
					hasAllElement,
					buildingName,
					buildingCode,
					buildingAddress,
					buildingLink
				));
			} else if (td.nodeName === "td" && !this.indexClassNames.includes(value)) {
				hasAllElement = false;
				break;
			}
		}

		const buildingInfo: BldInfo = { buildingName, buildingCode, address: buildingAddress, link: buildingLink };
		return { hasAllElement, buildingInfo };
	}

	private traverseTableCell(
		value: string,
		td: any,
		hasAllElement: boolean,
		buildingName: string,
		buildingCode: string,
		buildingAddress: string,
		buildingLink: string
	): {
		hasAllElement: boolean;
		buildingName: string;
		buildingCode: string;
		buildingAddress: string;
		buildingLink: string;
	} {
		switch (value) {
			case "views-field views-field-field-building-code":
				buildingCode = td.childNodes[0].value.trim();
				break;
			case "views-field views-field-title":
				buildingName = td.childNodes[1].childNodes[0].value.trim();
				break;
			case "views-field views-field-field-building-address":
				buildingAddress = td.childNodes[0].value.trim();
				break;
			case "views-field views-field-nothing":
				buildingLink = td.childNodes[1].attrs[0].value.substring(this.two);
				break;
		}

		return { hasAllElement, buildingName, buildingCode, buildingAddress, buildingLink };
	}

	private processTableBody(node: any, tag: string): any {
		if (!node?.childNodes) {
			return null;
		}

		const len = node.childNodes.length;
		for (let i = 0; i < len; i++) {
			const child = node.childNodes[i];
			if (child.nodeName === tag) {
				return child;
			}
		}
		return null;
	}

	public async processBldFile(document: any, dataset: Dataset, buildingInfo: BldInfo): Promise<void> {
		const table = this.processBldTable(document, "table");
		if (this.roomsTablePresent) {
			const tbody = this.processTableBody(table, "tbody");
			await this.handleBldNodes(tbody, "tr", buildingInfo, dataset);
		}
		return;
	}

	private processBldTable(node: any, tag: string): any {
		for (const child of node.childNodes || []) {
			if (this.isMatchingTable(child, tag)) {
				this.roomsTablePresent = true;
				return child;
			}

			const result = this.processBldTable(child, tag);
			if (result) {
				return result;
			}
		}
		return null;
	}

	private isMatchingTable(child: any, tag: string): boolean {
		return child.nodeName === tag && child.attrs[0].value === "views-table cols-5 table";
	}

	private async handleBldNodes(node: any, tag: string, buildingInfo: BldInfo, dataset: Dataset): Promise<void> {
		if (!node?.childNodes) {
			return;
		}

		const urlEncodedAddress = encodeURIComponent(buildingInfo.address);
		const urlForRoom = this.link + urlEncodedAddress;
		const location: LatLon = await this.getGeolocate(urlForRoom);

		for (const tr of node.childNodes) {
			if (tr.nodeName === tag) {
				let hasAllElement = true;
				hasAllElement = this.checkRoomValidity(tr, hasAllElement);
				if (hasAllElement) {
					this.counter++;
					this.getRData(buildingInfo, location.lat, location.lon, tr, dataset);
				}
			}
		}
	}

	private async getGeolocate(urlForRoom: string): Promise<LatLon> {
		return new Promise((resolve, reject) => {
			http
				.get(urlForRoom, (response) => {
					let data = "";
					response.on("data", (chunk) => {
						data += chunk;
					});
					response.on("end", () => {
						const json = JSON.parse(data);
						let location: LatLon;
						let buildingLat: string;
						let buildingLon: string;
						if (!json.error) {
							buildingLat = json.lat;
							buildingLon = json.lon;

							location = { lat: buildingLat.toString(), lon: buildingLon.toString() };

							resolve(location);
						} else {
							reject(new InsightError("cannot get geolocation"));
						}
					});
				})
				.on("error", (error) => {
					reject(error);
				});
		});
	}

	private checkRoomValidity(tr: any, hasAllElement: boolean): boolean {
		for (const td of tr.childNodes) {
			if (td.nodeName === "td" && this.bldRoomClassNames.includes(td.attrs[0].value)) {
				hasAllElement = hasAllElement && true;
			} else if (td.nodeName === "td" && !this.bldRoomClassNames.includes(td.attrs[0].value)) {
				hasAllElement = hasAllElement && false;
				break;
			}
		}
		return hasAllElement;
	}

	private getRData(buildingInfo: BldInfo, latitude: string, longitude: string, tr: any, dataset: Dataset): void {
		const buildingFullName = buildingInfo.buildingName;
		const buildingShortName = buildingInfo.buildingCode;
		const buildingAddress = buildingInfo.address;
		const roomLat = latitude;
		const roomLon = longitude;

		const roomDetails = this.parseRoom(tr);
		const roomName = `${buildingShortName}_${roomDetails.roomNumber}`;
		const newRoom = new Room(
			roomName,
			buildingFullName,
			buildingShortName,
			roomDetails.roomNumber,
			buildingAddress,
			Number(roomDetails.roomCapacity),
			roomDetails.roomType,
			roomDetails.roomFurniture,
			roomDetails.roomLink,
			Number(roomLat),
			Number(roomLon)
		);

		dataset.setValid(true);
		dataset.addValidRoom(newRoom);
	}

	private parseRoom(tr: any): {
		roomNumber: string;
		roomCapacity: string;
		roomType: string;
		roomFurniture: string;
		roomLink: string;
	} {
		let roomNumber = "",
			roomCapacity = "",
			roomType = "",
			roomFurniture = "",
			roomLink = "";

		for (const td of tr.childNodes) {
			if (td.nodeName === "td") {
				switch (td.attrs[0].value) {
					case "views-field views-field-field-room-number":
						roomNumber = td.childNodes[1].childNodes[0].value;
						break;
					case "views-field views-field-field-room-capacity":
						roomCapacity = td.childNodes[0].value.replace(/\D/g, "");
						break;
					case "views-field views-field-field-room-furniture":
						roomFurniture = td.childNodes[0].value.trim().match(/\S.*\S/)?.[0] || "";
						break;
					case "views-field views-field-field-room-type":
						roomType = td.childNodes[0].value.trim().match(/\S.*\S/)?.[0] || "";
						break;
					case "views-field views-field-nothing":
						roomLink = td.childNodes[1].attrs[0].value;
						break;
				}
			}
		}
		return { roomNumber, roomCapacity, roomType, roomFurniture, roomLink };
	}
}
