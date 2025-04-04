import { InsightError, InsightResult, ResultTooLargeError } from "./IInsightFacade";
import Query from "./Query";
import Transformations from "./Transformations";
import Section from "./Section";
import Room from "./Room";
//GPT Assisted

export default class QueryEngine {
	private dataset: (Section | Room)[];
	private static readonly MAX_RESULTS = 5000;

	constructor(d: (Section | Room)[]) {
		this.dataset = d;
	}

	public performQuery(q: unknown): InsightResult[] {
		const parsed = this.parseQuery(q);
		this.validateQuery(parsed);
		const filtered = this.dataset.filter(parsed.where.getFilterFunction());
		if (filtered.length >= QueryEngine.MAX_RESULTS) {
			throw new ResultTooLargeError("Too many results");
		}
		return this.buildResults(q, filtered, parsed);
	}

	public parseQuery(q: unknown): Query {
		if (typeof q !== "object" || q === null) {
			throw new InsightError("Query must be an object");
		}
		const x = q as any;
		if (x.WHERE === undefined || x.OPTIONS === undefined) {
			throw new InsightError("Query must have WHERE and OPTIONS");
		}
		return new Query(x.WHERE, x.OPTIONS, x);
	}

	public validateQuery(query: Query): void {
		query.validate();
		const ids = new Set<string>();
		let applyKeys: string[] = [];
		const qObj = query.raw;
		if (qObj.TRANSFORMATIONS && Array.isArray(qObj.TRANSFORMATIONS.APPLY)) {
			applyKeys = qObj.TRANSFORMATIONS.APPLY.map((rule: any) => Object.keys(rule)[0]);
		}
		for (const c of query.options.columns) {
			if (typeof c !== "string") {
				throw new InsightError("Column names must be strings");
			}
			if (!c.includes("_")) {
				if (!applyKeys.includes(c)) {
					throw new InsightError("Invalid column key query: " + c);
				}
			} else {
				const parts = c.split("_");
				if (parts.length !== 2) {
					throw new InsightError("Invalid column key query1: " + c);
				}
				ids.add(parts[0]);
			}
		}
		if (ids.size > 1) {
			throw new InsightError("Query references multiple datasets");
		}
		const dsId = ids.size === 1 ? [...ids][0] : "";
		this.checkWherePrefix(query.where, dsId);
	}

	private checkWherePrefix(where: any, dsId: string): void {
		this.checkClause(where.clause || where, dsId);
	}

	private checkClause(cl: any, dsId: string): void {
		const ks = Object.keys(cl);
		if (ks.length === 0) {
			return;
		}
		if (ks.length === 1) {
			const op = ks[0];
			const v = cl[op];
			if (op === "AND" || op === "OR") {
				if (!Array.isArray(v)) {
					throw new InsightError(op + " expects an array");
				}
				for (const sub of v) {
					this.checkClause(sub, dsId);
				}
			} else if (op === "NOT") {
				this.checkClause(v, dsId);
			} else if (["GT", "LT", "EQ", "IS"].includes(op)) {
				const fks = Object.keys(v);
				if (fks.length !== 1) {
					throw new InsightError("Comparator expects exactly one key");
				}
				if (fks[0].split("_")[0] !== dsId) {
					throw new InsightError("Multiple dataset references in WHERE");
				}
			} else {
				throw new InsightError("Invalid operator in WHERE clause: " + op);
			}
		} else {
			for (const k of ks) {
				this.checkClause({ [k]: cl[k] }, dsId);
			}
		}
	}

	//potential fix here to fix sorting order - aidan
	// private buildResults(q: unknown, filtered: (Section | Room)[], parsed: Query): InsightResult[] {
	// 	const obj = q as any;
	// 	if (obj.TRANSFORMATIONS) {
	// 		const aggregated = this.applyTransformations(obj.TRANSFORMATIONS, filtered);
	// 		return parsed.options.applyOptions(aggregated);
	// 	}
	// 	return parsed.options.applyOptions(filtered);
	// }

	private buildResults(q: unknown, filtered: (Section | Room)[], parsed: Query): InsightResult[] {
		const obj = q as any;
		const datasetId = this.extractDatasetIdFromQuery(obj);

		if (obj.TRANSFORMATIONS) {
			const aggregated = this.applyTransformations(obj.TRANSFORMATIONS, filtered, obj);
			return parsed.options.applyOptions(aggregated);
		}
		return parsed.options.applyOptions(this.mapToInsightRows(filtered, datasetId));
	}

	private extractDatasetIdFromQuery(query: any): string {
		const columnsId = this.extractIdFromColumns(query.OPTIONS?.COLUMNS);
		const groupId = query.TRANSFORMATIONS?.GROUP ? this.extractIdFromGroup(query.TRANSFORMATIONS.GROUP) : null;
		const applyId = query.TRANSFORMATIONS?.APPLY ? this.extractIdFromApply(query.TRANSFORMATIONS.APPLY) : null;

		return this.determineDatasetId(columnsId, groupId, applyId);
	}

	private extractIdFromColumns(columns: any[] | undefined): string | null {
		if (!columns || !Array.isArray(columns)) return null;

		let datasetId: string | null = null;
		for (const col of columns) {
			if (typeof col === "string" && col.includes("_")) {
				this.validateAndSetDatasetId(col, (ref) => (datasetId = ref));
			}
		}
		return datasetId;
	}

	private extractIdFromGroup(groupKeys: any[]): string | null {
		let datasetId: string | null = null;
		for (const groupKey of groupKeys) {
			if (typeof groupKey === "string" && groupKey.includes("_")) {
				this.validateAndSetDatasetId(groupKey, (ref) => (datasetId = ref));
			}
		}
		return datasetId;
	}

	private extractIdFromApply(applyRules: any[]): string | null {
		let datasetId: string | null = null;
		for (const applyRule of applyRules) {
			const applyKey = Object.keys(applyRule)[0];
			const applyValue = applyRule[applyKey];
			const fieldRef = applyValue[Object.keys(applyValue)[0]];

			if (typeof fieldRef === "string" && fieldRef.includes("_")) {
				this.validateAndSetDatasetId(fieldRef, (ref) => (datasetId = ref));
			}
		}
		return datasetId;
	}

	private validateAndSetDatasetId(field: string, setter: (id: string) => void): void {
		const parts = field.split("_");
		if (parts.length === 2) {
			setter(parts[0]);
		}
	}

	private determineDatasetId(...ids: (string | null)[]): string {
		const validIds = ids.filter((id) => id !== null) as string[];
		if (validIds.length === 0) {
			throw new InsightError("Could not determine dataset from query");
		}

		const uniqueIds = [...new Set(validIds)];
		if (uniqueIds.length > 1) {
			throw new InsightError("Query references multiple datasets");
		}

		return uniqueIds[0];
	}

	private applyTransformations(trans: any, filtered: (Section | Room)[], query: any): InsightResult[] {
		if (!trans.GROUP || !Array.isArray(trans.GROUP) || trans.GROUP.length === 0) {
			throw new InsightError("TRANSFORMATIONS must have a non-empty GROUP array");
		}

		// Extract dataset ID from the query
		const datasetId = this.extractDatasetIdFromQuery(query);

		const groupKeys = trans.GROUP;
		const applyRules = trans.APPLY || [];
		const transformations = new Transformations(groupKeys, applyRules);

		// Pass datasetId to mapToInsightRows
		const insightRows = this.mapToInsightRows(filtered, datasetId);
		const groups = transformations.groupData(insightRows);

		return transformations.applyAggregations(groups);
	}

	private mapToInsightRows(filtered: (Section | Room)[], datasetId: string): InsightResult[] {
		if (filtered.length === 0) {
			return [];
		}
		const sample = filtered[0];

		// Check if this is a Section dataset
		if ((sample as Section).getDepartment !== undefined) {
			return filtered.map((sec) => ({
				[`${datasetId}_dept`]: (sec as Section).getDepartment(),
				[`${datasetId}_avg`]: (sec as Section).getAvg(),
				[`${datasetId}_id`]: (sec as Section).getCourseID(),
				[`${datasetId}_instructor`]: (sec as Section).getInstructor(),
				[`${datasetId}_title`]: (sec as Section).getTitle(),
				[`${datasetId}_pass`]: (sec as Section).getPass(),
				[`${datasetId}_fail`]: (sec as Section).getFail(),
				[`${datasetId}_audit`]: (sec as Section).getAudit(),
				[`${datasetId}_uuid`]: (sec as Section).getSectionID(),
				[`${datasetId}_year`]: (sec as Section).getYear(),
			}));
		}
		// Otherwise it's a Room dataset
		return filtered.map((room) => ({
			[`${datasetId}_shortname`]: (room as Room).shortname,
			[`${datasetId}_fullname`]: (room as Room).fullname,
			[`${datasetId}_number`]: (room as Room).number,
			[`${datasetId}_address`]: (room as Room).address,
			[`${datasetId}_seats`]: (room as Room).seats,
			[`${datasetId}_type`]: (room as Room).type,
			[`${datasetId}_furniture`]: (room as Room).furniture,
			[`${datasetId}_href`]: (room as Room).href,
			[`${datasetId}_lat`]: (room as Room).lat,
			[`${datasetId}_lon`]: (room as Room).lon,
		}));
	}
}
