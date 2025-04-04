import { InsightError, InsightResult } from "./IInsightFacade";
import Decimal from "decimal.js";

export default class Transformations {
	private groupKeys: string[];
	private applyRules: any[];

	constructor(groupKeys: string[], applyRules: any[]) {
		this.groupKeys = groupKeys;
		this.applyRules = applyRules;
		const seen = new Set<string>();
		for (const rule of applyRules) {
			const keys = Object.keys(rule);
			if (keys.length !== 1) {
				throw new InsightError("Each apply rule must have exactly one key");
			}
			const applyKey = keys[0];
			if (seen.has(applyKey)) {
				throw new InsightError("Duplicate apply key: " + applyKey);
			}
			seen.add(applyKey);
		}
	}

	public groupData(data: InsightResult[]): Map<string, InsightResult[]> {
		const groups = new Map<string, InsightResult[]>();
		for (const row of data) {
			const key = this.groupKeys.map((k) => row[k]).join("||");
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(row);
		}
		return groups;
	}

	public applyAggregations(groups: Map<string, InsightResult[]>): InsightResult[] {
		const results: InsightResult[] = [];
		for (const [groupKey, groupRows] of groups.entries()) {
			const result = this.buildInitialGroupResult(groupKey);
			for (const rule of this.applyRules) {
				const applyKey = Object.keys(rule)[0];
				const opObj = rule[applyKey];
				const aggregator = Object.keys(opObj)[0];
				const field = opObj[aggregator];
				result[applyKey] = this.computeAggregate(aggregator, field, groupRows);
			}
			results.push(result);
		}
		return results;
	}

	private buildInitialGroupResult(groupKey: string): InsightResult {
		const groupValues = groupKey.split("||");
		const r: InsightResult = {};
		this.groupKeys.forEach((k, i) => {
			r[k] = groupValues[i];
		});
		return r;
	}

	private validateNumericAggregation(aggregator: string, field: string, rows: InsightResult[]): void {
		for (const row of rows) {
			if (!(field in row)) {
				throw new InsightError(`Missing field "${field}" in row`);
			}
			if (typeof row[field] !== "number") {
				throw new InsightError(`Aggregator ${aggregator} on non-numeric field: ${field}`);
			}
		}
	}

	private computeAggregate(aggregator: string, field: string, rows: InsightResult[]): number {
		if (!rows.length) {
			throw new InsightError("Cannot aggregate an empty group");
		}
		if (["MAX", "MIN", "SUM", "AVG"].includes(aggregator)) {
			this.validateNumericAggregation(aggregator, field, rows);
		}
		switch (aggregator) {
			case "MAX":
				return Math.max(...rows.map((r) => r[field] as number));
			case "MIN":
				return Math.min(...rows.map((r) => r[field] as number));
			case "SUM": {
				const total = rows.reduce((sum, r) => sum + (r[field] as number), 0);
				return Number(total.toFixed(2));
			}
			case "AVG": {
				let total = new Decimal(0);
				for (const r of rows) {
					total = total.add(new Decimal(r[field] as number));
				}
				return Number(total.dividedBy(rows.length).toFixed(2));
			}
			case "COUNT": {
				const unique = new Set(rows.map((r) => r[field]));
				return unique.size;
			}
			default:
				throw new InsightError("Invalid aggregator: " + aggregator);
		}
	}
}
