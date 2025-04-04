import { InsightError } from "./IInsightFacade";
import Options from "./Options";
import Section from "./Section";
import Room from "./Room";
import MComp from "./MComp";

export default class Where {
	private clause: any;

	constructor(clause: any) {
		this.clause = clause;
	}

	public getFilterFunction(): (obj: Section | Room) => boolean {
		if (Object.keys(this.clause).length === 0) {
			return () => true;
		}
		return this.parseClause(this.clause);
	}

	private parseClause(clause: any): (obj: Section | Room) => boolean {
		const keys = Object.keys(clause);
		if (keys.length > 1) {
			throw new InsightError("WHERE clause must have exactly one key");
		}
		const operator = keys[0];
		const value = clause[operator];

		if (operator === "AND") {
			if (!Array.isArray(value)) {
				throw new InsightError("AND expects an array");
			}
			const funcs = value.map((subClause: any) => this.parseClause(subClause));
			return (obj: Section | Room) => funcs.every((fn) => fn(obj));
		} else if (operator === "OR") {
			if (!Array.isArray(value)) {
				throw new InsightError("OR expects an array");
			}
			const funcs = value.map((subClause: any) => this.parseClause(subClause));
			return (obj: Section | Room) => funcs.some((fn) => fn(obj));
		} else if (operator === "NOT") {
			const fn = this.parseClause(value);
			return (obj: Section | Room) => !fn(obj);
		} else if (["GT", "LT", "EQ", "IS"].includes(operator)) {
			return this.parseComparator(operator, value);
		} else {
			throw new InsightError("Invalid operator in WHERE clause: " + operator);
		}
	}

	private parseComparator(operator: string, value: any): (obj: Section | Room) => boolean {
		const compKeys = Object.keys(value);
		if (compKeys.length !== 1) {
			throw new InsightError("Comparator expects exactly one key");
		}
		const field = compKeys[0];
		const target = value[field];

		return (obj: Section | Room) => {
			const fieldValue = Options.getField(obj, field);
			return MComp.applyComparator(operator, fieldValue, target);
		};
	}
}
