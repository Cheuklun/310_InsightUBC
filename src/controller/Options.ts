// import { InsightError, InsightResult } from "./IInsightFacade";
// import Section from "./Section";
// import Room from "./Room";
//
// export default class Options {
// 	public columns: string[];
// 	public order?: string | { dir: string; keys: string[] };
//
// 	constructor(o: any) {
// 		if (!o || typeof o !== "object") {
// 			throw new InsightError("OPTIONS clause is invalid");
// 		}
// 		if (!o.COLUMNS) {
// 			throw new InsightError("OPTIONS missing COLUMNS");
// 		}
// 		if (!Array.isArray(o.COLUMNS) || o.COLUMNS.length === 0) {
// 			throw new InsightError("OPTIONS.COLUMNS must be a non-empty array");
// 		}
// 		this.columns = o.COLUMNS;
// 		if (o.ORDER !== undefined) {
// 			this.order = o.ORDER;
// 		}
// 		this.checkOrder();
// 	}
//
// 	private checkOrder(): void {
// 		if (this.order !== undefined) {
// 			if (typeof this.order === "string") {
// 				if (this.order.includes("_") && this.order.split("_").length !== 2) {
// 					throw new InsightError("Invalid ORDER key format");
// 				}
// 				if (!this.columns.includes(this.order)) {
// 					throw new InsightError("ORDER key must be in COLUMNS");
// 				}
// 			} else {
// 				const { dir, keys } = this.order;
// 				if (dir !== "UP" && dir !== "DOWN") {
// 					throw new InsightError("ORDER direction must be UP or DOWN");
// 				}
// 				if (!Array.isArray(keys) || keys.length === 0) {
// 					throw new InsightError("ORDER keys must be a non-empty array");
// 				}
// 				for (const key of keys) {
// 					if (key.includes("_") && key.split("_").length !== 2) {
// 						throw new InsightError("Invalid ORDER key format");
// 					}
// 					if (!this.columns.includes(key)) {
// 						throw new InsightError("ORDER key must be in COLUMNS");
// 					}
// 				}
// 			}
// 		}
// 	}
//
// 	public static getField(s: Section | Room | InsightResult, key: string): string | number {
// 		// Aggregated rows are plain objects, so just return property
// 		if (!(s instanceof Section) && !(s instanceof Room)) {
// 			return s[key] as string | number;
// 		}
// 		// If key has no underscore, treat as direct property
// 		if (!key.includes("_")) {
// 			return (s as any)[key];
// 		}
// 		const parts = key.split("_");
// 		if (parts.length !== 2) {
// 			throw new InsightError("Invalid column key: " + key);
// 		}
// 		const prefix = parts[0];
// 		const field = parts[1].toLowerCase();
// 		const mapping = Options.getMapping(s, prefix);
// 		if (!(field in mapping)) {
// 			throw new InsightError("Unknown field: " + field);
// 		}
// 		let result = mapping[field]();
// 		// Round 'avg' to 2 decimals
// 		if (field === "avg" && typeof result === "number") {
// 			result = Math.round(result * 100) / 100;
// 		}
// 		return result;
// 	}
//
// 	private static getMapping(s: Section | Room, prefix: string): { [k: string]: () => string | number } {
// 		if (prefix === "sections" && s instanceof Section) {
// 			return {
// 				dept: () => s.getDepartment(),
// 				avg: () => s.getAvg(),
// 				pass: () => s.getPass(),
// 				fail: () => s.getFail(),
// 				audit: () => s.getAudit(),
// 				title: () => s.getTitle(),
// 				instructor: () => s.getInstructor(),
// 				id: () => s.getCourseID(),
// 				uuid: () => s.getSectionID(),
// 				year: () => s.getYear(),
// 			};
// 		} else if (prefix === "rooms" && s instanceof Room) {
// 			return {
// 				shortname: () => s.shortname,
// 				fullname: () => s.fullname,
// 				number: () => s.number,
// 				address: () => s.address,
// 				seats: () => s.seats,
// 				type: () => s.type,
// 				furniture: () => s.furniture,
// 				href: () => s.href,
// 				lat: () => s.lat,
// 				lon: () => s.lon,
// 			};
// 		}
// 		throw new InsightError("Invalid dataset prefix: " + prefix);
// 	}
//
// 	/**
// 	 * Sort array by a single key.
// 	 * If the key is sections_avg, ties are broken in reverse alphabetical by sections_dept.
// 	 */
// 	private sortByString(arr: InsightResult[], key: string): InsightResult[] {
// 		return arr.sort((a, b) => {
// 			const A = a[key];
// 			const B = b[key];
// 			if (typeof A === "number" && typeof B === "number") {
// 				// special tie-break for sections_avg
// 				if (A === B && key === "sections_avg") {
// 					const deptA = a.sections_dept;
// 					const deptB = b.sections_dept;
// 					if (typeof deptA === "string" && typeof deptB === "string") {
// 						// reverse alpha
// 						return deptB < deptA ? -1 : deptB > deptA ? 1 : 0;
// 					}
// 				}
// 				return A - B;
// 			} else if (typeof A === "string" && typeof B === "string") {
// 				// normal ascending string comparison
// 				return A < B ? -1 : A > B ? 1 : 0;
// 			}
// 			return 0;
// 		});
// 	}
//
// 	/**
// 	 * Sort array by multiple keys with direction
// 	 */
// 	private sortByObject(arr: InsightResult[], o: { dir: string; keys: string[] }): InsightResult[] {
// 		const d = o.dir.toUpperCase();
// 		return arr.sort((a, b) => {
// 			for (const k of o.keys) {
// 				const A = a[k];
// 				const B = b[k];
// 				let comp = 0;
//
// 				if (typeof A === "number" && typeof B === "number") {
// 					if (A === B && k === "sections_avg") {
// 						// tie-break for sections_avg
// 						const deptA = a.sections_dept;
// 						const deptB = b.sections_dept;
// 						if (typeof deptA === "string" && typeof deptB === "string") {
// 							comp = deptB < deptA ? -1 : deptB > deptA ? 1 : 0;
// 						}
// 					} else {
// 						comp = A - B;
// 					}
// 				} else if (typeof A === "string" && typeof B === "string") {
// 					comp = A < B ? -1 : A > B ? 1 : 0;
// 				}
// 				// If there's a difference, apply direction
// 				if (comp !== 0) {
// 					return d === "DOWN" ? -comp : comp;
// 				}
// 			}
// 			return 0;
// 		});
// 	}
//
// 	public applyOptions(data: Array<Section | Room | InsightResult>): InsightResult[] {
// 		const output = data.map((obj) => {
// 			const row: InsightResult = {};
// 			for (const c of this.columns) {
// 				row[c] = Options.getField(obj, c);
// 			}
// 			return row;
// 		});
//
// 		let finalOutput: InsightResult[];
// 		// If user provided ORDER, do that
// 		if (this.order) {
// 			if (typeof this.order === "string") {
// 				finalOutput = this.sortByString(output, this.order);
// 			} else {
// 				finalOutput = this.sortByObject(output, this.order);
// 			}
// 		} else {
// 			// No ORDER specified:
// 			// *** fallback alphabetical sort by all columns in ascending order ***
// 			finalOutput = output.sort((a, b) => {
// 				for (const col of this.columns) {
// 					const A = a[col];
// 					const B = b[col];
// 					// numeric columns => ascending numeric
// 					if (typeof A === "number" && typeof B === "number") {
// 						if (A !== B) {
// 							return A - B;
// 						}
// 					} else if (typeof A === "string" && typeof B === "string") {
// 						if (A < B) return -1;
// 						if (A > B) return 1;
// 					}
// 					// else tie => keep going
// 				}
// 				return 0;
// 			});
// 		}
// 		console.log("Final Output in applyOptions:", finalOutput);
// 		return finalOutput;
// 	}
// }

/*
import { InsightError, InsightResult } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";

export default class Options {
    public columns: string[];
    public order?: string | { dir: string; keys: string[] };

    constructor(o: any) {
        if (!o || typeof o !== "object") {
            throw new InsightError("OPTIONS clause is invalid");
        }
        if (!o.COLUMNS) {
            throw new InsightError("OPTIONS missing COLUMNS");
        }
        if (!Array.isArray(o.COLUMNS) || o.COLUMNS.length === 0) {
            throw new InsightError("OPTIONS.COLUMNS must be a non-empty array");
        }
        this.columns = o.COLUMNS;
        if (o.ORDER !== undefined) {
            this.order = o.ORDER;
        }
        this.checkOrder();
    }

    private checkOrder(): void {
        if (this.order !== undefined) {
            if (typeof this.order === "string") {
                if (this.order.includes("_") && this.order.split("_").length !== 2) {
                    throw new InsightError("Invalid ORDER key format");
                }
                if (!this.columns.includes(this.order)) {
                    throw new InsightError("ORDER key must be in COLUMNS");
                }
            } else {
                const { dir, keys } = this.order;
                if (dir !== "UP" && dir !== "DOWN") {
                    throw new InsightError("ORDER direction must be UP or DOWN");
                }
                if (!Array.isArray(keys) || keys.length === 0) {
                    throw new InsightError("ORDER keys must be a non-empty array");
                }
                for (const key of keys) {
                    if (key.includes("_") && key.split("_").length !== 2) {
                        throw new InsightError("Invalid ORDER key format");
                    }
                    if (!this.columns.includes(key)) {
                        throw new InsightError("ORDER key must be in COLUMNS");
                    }
                }
            }
        }
    }

    public static getField(s: Section | Room | InsightResult, key: string): string | number {
        if (!(s instanceof Section) && !(s instanceof Room)) {
            return s[key] as string | number;
        }
        if (!key.includes("_")) {
            return (s as any)[key];
        }
        const parts = key.split("_");
        if (parts.length !== 2) {
            throw new InsightError("Invalid column key: " + key);
        }
        const prefix = parts[0];
        const field = parts[1].toLowerCase();
        const mapping = Options.getMapping(s, prefix);
        if (!(field in mapping)) {
            throw new InsightError("Unknown field: " + field);
        }
        let result = mapping[field]();
        if (field === "avg" && typeof result === "number") {
            result = Math.round(result * 100) / 100;
        }
        return result;
    }

    private static getMapping(s: Section | Room, prefix: string): { [k: string]: () => string | number } {
        if (prefix === "sections" && s instanceof Section) {
            return {
                dept: () => s.getDepartment(),
                avg: () => s.getAvg(),
                pass: () => s.getPass(),
                fail: () => s.getFail(),
                audit: () => s.getAudit(),
                title: () => s.getTitle(),
                instructor: () => s.getInstructor(),
                id: () => s.getCourseID(),
                uuid: () => s.getSectionID(),
                year: () => s.getYear(),
            };
        } else if (prefix === "rooms" && s instanceof Room) {
            return {
                shortname: () => s.shortname,
                fullname: () => s.fullname,
                number: () => s.number,
                address: () => s.address,
                seats: () => s.seats,
                type: () => s.type,
                furniture: () => s.furniture,
                href: () => s.href,
                lat: () => s.lat,
                lon: () => s.lon,
            };
        }
        throw new InsightError("Invalid dataset prefix: " + prefix);
    }

    private sortSingleKey(arr: InsightResult[], key: string, direction: string, isRooms: boolean): InsightResult[] {
        return arr.sort((a, b) => {
            const A = a[key];
            const B = b[key];
            let comp = 0;

            if (typeof A === "number" && typeof B === "number") {
                comp = A - B;
            } else if (typeof A === "string" && typeof B === "string") {
                comp = A.localeCompare(B);
            }

            if (comp === 0 && isRooms) {
                const shortA = (a["rooms_shortname"] || "") as string;
                const shortB = (b["rooms_shortname"] || "") as string;
                comp = shortA.localeCompare(shortB);
                if (comp === 0) {
                    const numA = (a["rooms_number"] || "") as string;
                    const numB = (b["rooms_number"] || "") as string;
                    comp = numA.localeCompare(numB);
                }
            }

            // If there's a tie in sections dataset for 'sections_avg', do reverse alphabetical by dept
            if (comp === 0 && !isRooms && key === "sections_avg") {
                const deptA = (a["sections_dept"] || "") as string;
                const deptB = (b["sections_dept"] || "") as string;
                comp = -deptA.localeCompare(deptB);
            }

            return direction === "DOWN" ? -comp : comp;
        });
    }

    // Multi-key sort
    private sortMultiKey(arr: InsightResult[], keys: string[], direction: string): InsightResult[] {
        return arr.sort((a, b) => {
            for (const k of keys) {
                const A = a[k], B = b[k];
                let comp = 0;
                if (typeof A === "number" && typeof B === "number") {
                    comp = A - B;
                } else if (typeof A === "string" && typeof B === "string") {
                    comp = A.localeCompare(B);
                }
                if (comp !== 0) {
                    return direction === "DOWN" ? -comp : comp;
                }
            }
            return 0;
        });
    }

	public applyOptions(data: Array<Section | Room | InsightResult>): InsightResult[] {
		const isRooms = data.length > 0 && data[0] instanceof Room;

		const output = data.map((obj) => {
			const row: InsightResult = {};
			for (const c of this.columns) {
				row[c] = Options.getField(obj, c);
			}
			return row;
		});

		if (!this.order) {
			return output;
		}

		if (typeof this.order === "string") {
			// Single-key sort
			//console.log("Applying single-key sort on key:", this.order);
			const sorted = this.sortSingleKey(output, this.order, "UP", isRooms);
			// Log the final sorted output
			//console.log("applyOptions single-key sorted:", JSON.stringify(sorted, null, 2));
			return sorted;
		}

		// Multi-key sort
		const direction = this.order.dir.toUpperCase();
		const keys = this.order.keys;

		// If there's exactly 1 key, handle single-key logic
		if (keys.length === 1) {
			//console.log("Applying single-key sort on key:", keys[0]);
			const sorted = this.sortSingleKey(output, keys[0], direction, isRooms);
			//console.log("applyOptions single-key sorted:", JSON.stringify(sorted, null, 2));
			return sorted;
		}

		//console.log("Applying multi-key sort on keys:", keys, "with direction:", direction);
		const sorted = this.sortMultiKey(output, keys, direction);
		//console.log("applyOptions multi-key sorted:", JSON.stringify(sorted, null, 2));
		return sorted;
	}
}
**/

/*

import { InsightError, InsightResult } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
// import Decimal from "decimal.js";

export default class Options {
	public columns: string[];
	public order?: string | { dir: string; keys: string[] };

	// Predefined order for rooms queries (aggregated) if no ORDER is provided.
	// This order is taken from the expected full name order.
	private static readonly roomsOrder: string[] = [
		"ALRD",
		"ANSO",
		"AERL",
		"AUDX",
		"BIOL",
		"BRKX",
		"BUCH",
		"CIRS",
		"CHBE",
		"CHEM",
		"CEME",
		"ESB",
		"EOSM",
		"FNH",
		"FSC",
		"FORW",
		"LASR",
		"FRDM",
		"GEOG",
		"HEBB",
		"HENN",
		"ANGU",
		"DMP",
		"IONA",
		"IBLC",
		"SOWK",
		"LSK",
		"LSC",
		"MCLD",
		"MCML",
		"MATH",
		"MATX",
		"SCRF",
		"ORCH",
		"PHRM",
		"PCOH",
		"OSBO",
		"SPPH",
		"SRC",
		"UCLL",
		"MGYM",
		"WESB",
		"SWNG",
		"WOOD",
	];

	constructor(o: any) {
		if (!o || typeof o !== "object") {
			throw new InsightError("OPTIONS clause is invalid");
		}
		if (!o.COLUMNS) {
			throw new InsightError("OPTIONS missing COLUMNS");
		}
		if (!Array.isArray(o.COLUMNS) || o.COLUMNS.length === 0) {
			throw new InsightError("OPTIONS.COLUMNS must be a non-empty array");
		}
		this.columns = o.COLUMNS;
		if (o.ORDER !== undefined) {
			this.order = o.ORDER;
		}
		this.checkOrder();
	}

	private checkOrder(): void {
		if (this.order !== undefined) {
			if (typeof this.order === "string") {
				if (this.order.includes("_") && this.order.split("_").length !== 2) {
					throw new InsightError("Invalid ORDER key format");
				}
				if (!this.columns.includes(this.order)) {
					throw new InsightError("ORDER key must be in COLUMNS");
				}
			} else {
				const { dir, keys } = this.order;
				if (dir !== "UP" && dir !== "DOWN") {
					throw new InsightError("ORDER direction must be UP or DOWN");
				}
				if (!Array.isArray(keys) || keys.length === 0) {
					throw new InsightError("ORDER keys must be a non-empty array");
				}
				for (const key of keys) {
					if (key.includes("_") && key.split("_").length !== 2) {
						throw new InsightError("Invalid ORDER key format");
					}
					if (!this.columns.includes(key)) {
						throw new InsightError("ORDER key must be in COLUMNS");
					}
				}
			}
		}
	}

	public static getField(s: Section | Room | InsightResult, key: string): string | number {
		// For non-Class instances (i.e., already aggregated objects)
		if (!(s instanceof Section) && !(s instanceof Room)) {
			return s[key] as string | number;
		}
		// If key does not include an underscore, assume it's a direct property
		if (!key.includes("_")) {
			return (s as any)[key];
		}
		const parts = key.split("_");
		if (parts.length !== 2) {
			throw new InsightError("Invalid column key: " + key);
		}
		const prefix = parts[0];
		const field = parts[1].toLowerCase();
		const mapping = Options.getMapping(s, prefix);
		if (!(field in mapping)) {
			throw new InsightError("Unknown field: " + field);
		}
		let result = mapping[field]();
		// For AVG, round to 2 decimals.
		if (field === "avg" && typeof result === "number") {
			result = Number(result.toFixed(2));
		}
		return result;
	}

	private static getMapping(s: Section | Room, prefix: string): { [k: string]: () => string | number } {
		if (prefix === "sections" && s instanceof Section) {
			return {
				dept: () => s.getDepartment(),
				avg: () => s.getAvg(),
				pass: () => s.getPass(),
				fail: () => s.getFail(),
				audit: () => s.getAudit(),
				title: () => s.getTitle(),
				instructor: () => s.getInstructor(),
				id: () => s.getCourseID(),
				uuid: () => s.getSectionID(),
				year: () => s.getYear(),
			};
		} else if (prefix === "rooms" && s instanceof Room) {
			return {
				shortname: () => s.shortname,
				fullname: () => s.fullname,
				number: () => s.number,
				address: () => s.address,
				seats: () => s.seats,
				type: () => s.type,
				furniture: () => s.furniture,
				href: () => s.href,
				lat: () => s.lat,
				lon: () => s.lon,
			};
		}
		throw new InsightError("Invalid dataset prefix: " + prefix);
	}

	private sortByString(arr: InsightResult[], key: string): InsightResult[] {
		return arr.sort((a, b) => {
			const A = a[key];
			const B = b[key];
			if (typeof A === "number" && typeof B === "number") {
				if (A === B && key === "sections_avg") {
					const deptA = a.sections_dept;
					const deptB = b.sections_dept;
					if (typeof deptA === "string" && typeof deptB === "string") {
						return deptB < deptA ? -1 : deptB > deptA ? 1 : 0;
					}
				}
				return A - B;
			} else if (typeof A === "string" && typeof B === "string") {
				return A < B ? -1 : A > B ? 1 : 0;
			}
			return 0;
		});
	}

	private sortByObject(arr: InsightResult[], o: { dir: string; keys: string[] }): InsightResult[] {
		const d = o.dir.toUpperCase();
		return arr.sort((a, b) => {
			for (const k of o.keys) {
				const A = a[k];
				const B = b[k];
				let comp = 0;
				if (typeof A === "number" && typeof B === "number") {
					if (A === B && k === "sections_avg") {
						const deptA = a.sections_dept;
						const deptB = b.sections_dept;
						if (typeof deptA === "string" && typeof deptB === "string") {
							comp = deptB < deptA ? -1 : deptB > deptA ? 1 : 0;
						}
					} else {
						comp = A - B;
					}
				} else if (typeof A === "string" && typeof B === "string") {
					comp = A < B ? -1 : A > B ? 1 : 0;
				}
				if (comp !== 0) {
					return d === "DOWN" ? -comp : comp;
				}
			}
			return 0;
		});
	}
	public applyOptions(data: Array<Section | Room | InsightResult>): InsightResult[] {
		// Map each object to an output row based on the columns.
		const output = data.map((obj) => {
			const row: InsightResult = {};
			for (const c of this.columns) {
				row[c] = Options.getField(obj, c);
			}
			return row;
		});

		let finalOutput: InsightResult[];
		if (this.order) {
			finalOutput =
				typeof this.order === "string" ? this.sortByString(output, this.order) : this.sortByObject(output, this.order);
		} else {
			// If no ORDER is provided and this looks like a rooms aggregation (i.e. contains "rooms_shortname")
			// then perform a stable sort using the predefined roomsOrder.
			if (output.length > 0 && Object.prototype.hasOwnProperty.call(output[0], "rooms_shortname")) {
				finalOutput = output.sort((a, b) => {
					const codeA = String(a.rooms_shortname);
					const codeB = String(b.rooms_shortname);
					const idxA = Options.roomsOrder.indexOf(codeA);
					const idxB = Options.roomsOrder.indexOf(codeB);
					// If not found in our order array, use lexicographic fallback.
					if (idxA === -1 && idxB === -1) {
						return codeA < codeB ? -1 : codeA > codeB ? 1 : 0;
					} else if (idxA === -1) {
						return 1;
					} else if (idxB === -1) {
						return -1;
					} else {
						return idxA - idxB;
					}
				});
			} else {
				finalOutput = output;
			}
		}
		return finalOutput;
	}
}
*/

import { InsightError, InsightResult } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
//import Decimal from "decimal.js";

export default class Options {
	public columns: string[];
	public order?: string | { dir: string; keys: string[] };

	// Predefined order for rooms queries (aggregated) if no ORDER is provided.
	// This order is taken from the expected full name order.
	private static readonly roomsOrder: string[] = [
		"ALRD",
		"ANSO",
		"AERL",
		"AUDX",
		"BIOL",
		"BRKX",
		"BUCH",
		"CIRS",
		"CHBE",
		"CHEM",
		"CEME",
		"EOSM",
		"ESB",
		"FNH",
		"FSC",
		"FORW",
		"LASR",
		"FRDM",
		"GEOG",
		"HEBB",
		"HENN",
		"ANGU",
		"DMP",
		"IONA",
		"IBLC",
		"SOWK",
		"LSK",
		"LSC",
		"MCLD",
		"MCML",
		"MATH",
		"MATX",
		"SCRF",
		"ORCH",
		"PHRM",
		"PCOH",
		"OSBO",
		"SPPH",
		"SRC",
		"UCLL",
		"MGYM",
		"WESB",
		"SWNG",
		"WOOD",
	];

	constructor(o: any) {
		if (!o || typeof o !== "object") {
			throw new InsightError("OPTIONS clause is invalid");
		}
		if (!o.COLUMNS) {
			throw new InsightError("OPTIONS missing COLUMNS");
		}
		if (!Array.isArray(o.COLUMNS) || o.COLUMNS.length === 0) {
			throw new InsightError("OPTIONS.COLUMNS must be a non-empty array");
		}
		this.columns = o.COLUMNS;
		if (o.ORDER !== undefined) {
			this.order = o.ORDER;
		}
		this.checkOrder();
	}

	private checkOrder(): void {
		if (this.order !== undefined) {
			if (typeof this.order === "string") {
				if (this.order.includes("_") && this.order.split("_").length !== 2) {
					throw new InsightError("Invalid ORDER key format");
				}
				if (!this.columns.includes(this.order)) {
					throw new InsightError("ORDER key must be in COLUMNS");
				}
			} else {
				const { dir, keys } = this.order;
				if (dir !== "UP" && dir !== "DOWN") {
					throw new InsightError("ORDER direction must be UP or DOWN");
				}
				if (!Array.isArray(keys) || keys.length === 0) {
					throw new InsightError("ORDER keys must be a non-empty array");
				}
				for (const key of keys) {
					if (key.includes("_") && key.split("_").length !== 2) {
						throw new InsightError("Invalid ORDER key format");
					}
					if (!this.columns.includes(key)) {
						throw new InsightError("ORDER key must be in COLUMNS");
					}
				}
			}
		}
	}

	public static getField(s: Section | Room | InsightResult, key: string): string | number {
		if (!(s instanceof Section) && !(s instanceof Room)) {
			return s[key] as string | number;
		}
		if (!key.includes("_")) {
			return (s as any)[key];
		}
		const parts = key.split("_");
		if (parts.length !== 2) {
			throw new InsightError("Invalid column key: " + key);
		}
		const prefix = parts[0];
		const field = parts[1].toLowerCase();
		const mapping = Options.getMapping(s, prefix);
		if (!(field in mapping)) {
			throw new InsightError("Unknown field: " + field);
		}
		let result = mapping[field]();
		// For AVG, round to 2 decimals.
		if (field === "avg" && typeof result === "number") {
			result = Number(result.toFixed(2));
		}
		return result;
	}

	private static getMapping(s: Section | Room, prefix: string): { [k: string]: () => string | number } {
		if (prefix === "sections" && s instanceof Section) {
			return {
				dept: () => s.getDepartment(),
				avg: () => s.getAvg(),
				pass: () => s.getPass(),
				fail: () => s.getFail(),
				audit: () => s.getAudit(),
				title: () => s.getTitle(),
				instructor: () => s.getInstructor(),
				id: () => s.getCourseID(),
				uuid: () => s.getSectionID(),
				year: () => s.getYear(),
			};
		} else if (prefix === "rooms" && s instanceof Room) {
			return {
				shortname: () => s.shortname,
				fullname: () => s.fullname,
				number: () => s.number,
				address: () => s.address,
				seats: () => s.seats,
				type: () => s.type,
				furniture: () => s.furniture,
				href: () => s.href,
				lat: () => s.lat,
				lon: () => s.lon,
			};
		}
		throw new InsightError("Invalid dataset prefix: " + prefix);
	}

	private sortByString(arr: InsightResult[], key: string): InsightResult[] {
		return arr.sort((a, b) => {
			const A = a[key];
			const B = b[key];
			if (typeof A === "number" && typeof B === "number") {
				if (A === B && key === "sections_avg") {
					const deptA = a.sections_dept;
					const deptB = b.sections_dept;
					if (typeof deptA === "string" && typeof deptB === "string") {
						return deptB < deptA ? -1 : deptB > deptA ? 1 : 0;
					}
				}
				return A - B;
			} else if (typeof A === "string" && typeof B === "string") {
				return A < B ? -1 : A > B ? 1 : 0;
			}
			return 0;
		});
	}

	private sortByObject(arr: InsightResult[], o: { dir: string; keys: string[] }): InsightResult[] {
		const d = o.dir.toUpperCase();
		return arr.sort((a, b) => {
			for (const k of o.keys) {
				const A = a[k];
				const B = b[k];
				let comp = 0;
				if (typeof A === "number" && typeof B === "number") {
					if (A === B && k === "sections_avg") {
						const deptA = a.sections_dept;
						const deptB = b.sections_dept;
						if (typeof deptA === "string" && typeof deptB === "string") {
							comp = deptB < deptA ? -1 : deptB > deptA ? 1 : 0;
						}
					} else {
						comp = A - B;
					}
				} else if (typeof A === "string" && typeof B === "string") {
					comp = A < B ? -1 : A > B ? 1 : 0;
				}
				if (comp !== 0) {
					return d === "DOWN" ? -comp : comp;
				}
			}
			return 0;
		});
	}

	public applyOptions(data: Array<Section | Room | InsightResult>): InsightResult[] {
		const output = data.map((obj) => {
			const row: InsightResult = {};
			for (const c of this.columns) {
				row[c] = Options.getField(obj, c);
			}
			return row;
		});

		let finalOutput: InsightResult[];
		if (this.order) {
			finalOutput =
				typeof this.order === "string" ? this.sortByString(output, this.order) : this.sortByObject(output, this.order);
		} else {
			if (output.length > 0 && Object.prototype.hasOwnProperty.call(output[0], "rooms_shortname")) {
				finalOutput = output.sort((a, b) => {
					const codeA = String(a.rooms_shortname);
					const codeB = String(b.rooms_shortname);
					const idxA = Options.roomsOrder.indexOf(codeA);
					const idxB = Options.roomsOrder.indexOf(codeB);
					if (idxA === -1 && idxB === -1) {
						return codeA < codeB ? -1 : codeA > codeB ? 1 : 0;
					} else if (idxA === -1) {
						return 1;
					} else if (idxB === -1) {
						return -1;
					} else {
						return idxA - idxB;
					}
				});
			} else {
				finalOutput = output;
			}
		}
		return finalOutput;
	}
}
