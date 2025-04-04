import { expect } from "chai";
import { InsightError, ResultTooLargeError } from "../../src/controller/IInsightFacade";
import QueryEngine from "../../src/controller/QueryEngine";
import Section from "../../src/controller/Section";

const DUMMY_YEAR = 2020;
const AVG_LOW = 10;
const AVG_MED = 20;
const AVG_HIGH = 30;
const THRESHOLD_GT = 15;
const THRESHOLD_LT = 25;
const NUM_SECTIONS_THRESHOLD = 5000;

class DummySection extends Section {
	constructor(dept: string, avg: number, year: number = DUMMY_YEAR) {
		super("dummy_uuid", "dummy_id", "dummy_title", "dummy_instructor", dept, year, avg, 0, 0, 0);
	}
}

describe("QueryEngine", function () {
	let engine: QueryEngine;
	const sections: DummySection[] = [
		new DummySection("dummy", AVG_LOW),
		new DummySection("dummy", AVG_MED),
		new DummySection("dummy", AVG_HIGH),
	];
	beforeEach(function () {
		engine = new QueryEngine(sections);
	});
	it("should throw an error when WHERE clause has inconsistent dataset prefix", function () {
		const query = {
			WHERE: { GT: { dummy_avg: THRESHOLD_GT }, LT: { other_avg: THRESHOLD_LT } },
			OPTIONS: { COLUMNS: ["dummy_dept", "dummy_avg"], ORDER: "dummy_avg" },
		};
		expect(() => engine.validateQuery(engine.parseQuery(query))).to.throw(InsightError);
	});
	it("should throw a ResultTooLargeError when filtered results exceed threshold", function () {
		const manySections: DummySection[] = [];
		for (let i = 0; i < NUM_SECTIONS_THRESHOLD; i++) {
			manySections.push(new DummySection("dummy", 100));
		}
		const engine2 = new QueryEngine(manySections);
		const query = { WHERE: {}, OPTIONS: { COLUMNS: ["dummy_dept", "dummy_avg"], ORDER: "dummy_avg" } };
		expect(() => engine2.performQuery(query)).to.throw(ResultTooLargeError);
	});
});
