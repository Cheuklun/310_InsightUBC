import { expect } from "chai";
import Where from "../../src/controller/Where";
import { InsightError } from "../../src/controller/IInsightFacade";

const TEST_YEAR = 2020;
const COMP_FIELD1 = "dummy_avg";
const COMP_FIELD2 = "dummy_year";
const COMP_VALUE = 10;

describe("Where Error Conditions", function () {
	it("should throw an error when AND expects an array", function () {
		const whereObj = { AND: "not an array" };
		const where = new Where(whereObj);
		expect(() => where.getFilterFunction()).to.throw(InsightError, "AND expects an array");
	});
	it("should throw an error when OR expects an array", function () {
		const whereObj = { OR: "not an array" };
		const where = new Where(whereObj);
		expect(() => where.getFilterFunction()).to.throw(InsightError, "OR expects an array");
	});
	it("should throw an error for an invalid operator", function () {
		const whereObj = { INVALID: { [COMP_FIELD1]: COMP_VALUE } };
		const where = new Where(whereObj);
		expect(() => where.getFilterFunction()).to.throw(InsightError, "Invalid operator in WHERE clause: INVALID");
	});
	it("should throw an error if comparator has more than one key", function () {
		const whereObj = { GT: { [COMP_FIELD1]: COMP_VALUE, [COMP_FIELD2]: TEST_YEAR } };
		const where = new Where(whereObj);
		expect(() => where.getFilterFunction()).to.throw(InsightError, "Comparator expects exactly one key");
	});
	it("should throw an error if WHERE clause has more than one key", function () {
		const whereObj = { GT: { [COMP_FIELD1]: COMP_VALUE }, LT: { [COMP_FIELD1]: COMP_VALUE } };
		const where = new Where(whereObj);
		expect(() => where.getFilterFunction()).to.throw(InsightError, "WHERE clause must have exactly one key");
	});
});
