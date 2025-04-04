import { InsightError } from "./IInsightFacade";
import Where from "./Where";
import Options from "./Options";

export default class Query {
	public where: Where;
	public options: Options;
	public raw: any;

	constructor(whereClause: any, optionsClause: any, rawQuery: any) {
		this.where = new Where(whereClause);
		this.options = new Options(optionsClause);
		this.raw = rawQuery;
	}

	public validate(): void {
		if (!this.options.columns || !Array.isArray(this.options.columns) || this.options.columns.length === 0) {
			throw new InsightError("OPTIONS must have a non-empty COLUMNS array");
		}
	}
}
