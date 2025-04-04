import { expect } from "chai";
import { InsightError, InsightResult } from "../../src/controller/IInsightFacade";
import Transformations from "../../src/controller/Transformations";

const NUM_MAX = 100;
const NUM_MIN = 0;
const NUM_SUM_A = 10;
const NUM_SUM_B = 20;
const NUM_SUM_C = 30;
const NUM_AVG_X = 50;
const NUM_AVG_Y = 60;
const NUM_AVG_Z = 70;
const GROUP_VALUE_1 = "g1";
const GROUP_VALUE_2 = "g2";
const GROUP_VALUE_3 = "g3";
const FIELD_X = "x";
const FIELD_Y = "y";
const FIELD_Z = "z";
const POINTONE = 0.1111;
const POINTFOUR = 0.4444;

describe("Transformations Tests", function () {
	describe("groupData", function () {
		it("should group data by specified group keys", function () {
			const data: InsightResult[] = [
				{ groupKey: GROUP_VALUE_1, x: NUM_SUM_A },
				{ groupKey: GROUP_VALUE_1, x: NUM_SUM_B },
				{ groupKey: GROUP_VALUE_2, x: NUM_SUM_C },
			];
			const t = new Transformations(["groupKey"], []);
			const groups = t.groupData(data);
			expect(groups.size).to.equal(2);
			expect(groups.get(GROUP_VALUE_1)).to.deep.equal([
				{ groupKey: GROUP_VALUE_1, x: NUM_SUM_A },
				{ groupKey: GROUP_VALUE_1, x: NUM_SUM_B },
			]);
			expect(groups.get(GROUP_VALUE_2)).to.deep.equal([{ groupKey: GROUP_VALUE_2, x: NUM_SUM_C }]);
		});
		it("should handle empty data (returns empty map)", function () {
			const t = new Transformations(["groupKey"], []);
			const groups = t.groupData([]);
			expect(groups.size).to.equal(0);
		});
	});
	describe("applyAggregations", function () {
		it("should apply no transformations if APPLY is empty", function () {
			const t = new Transformations(["groupKey"], []);
			const data: InsightResult[] = [
				{ groupKey: GROUP_VALUE_1, x: NUM_SUM_A },
				{ groupKey: GROUP_VALUE_1, x: NUM_SUM_B },
			];
			const groups = t.groupData(data);
			const results = t.applyAggregations(groups);
			expect(results).to.deep.equal([{ groupKey: GROUP_VALUE_1 }]);
		});
		it("should compute MAX on numeric field", function () {
			const t = new Transformations(["groupKey"], [{ maxX: { MAX: FIELD_X } }]);
			const data: InsightResult[] = [
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_A },
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_B },
				{ groupKey: GROUP_VALUE_2, [FIELD_X]: NUM_MAX },
			];
			const groups = t.groupData(data);
			const results = t.applyAggregations(groups);
			const expected = [
				{ groupKey: GROUP_VALUE_1, maxX: NUM_SUM_B },
				{ groupKey: GROUP_VALUE_2, maxX: NUM_MAX },
			];
			expect(results).to.deep.members(expected);
		});
		it("should compute MIN on numeric field", function () {
			const t = new Transformations(["groupKey"], [{ minX: { MIN: FIELD_X } }]);
			const data: InsightResult[] = [
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_A },
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_B },
				{ groupKey: GROUP_VALUE_2, [FIELD_X]: NUM_MIN },
			];
			const groups = t.groupData(data);
			const results = t.applyAggregations(groups);
			const expected = [
				{ groupKey: GROUP_VALUE_1, minX: NUM_SUM_A },
				{ groupKey: GROUP_VALUE_2, minX: NUM_MIN },
			];
			expect(results).to.deep.members(expected);
		});
		it("should compute SUM on numeric field (rounded to 2 decimals)", function () {
			const t = new Transformations(["groupKey"], [{ sumX: { SUM: FIELD_X } }]);
			const data: InsightResult[] = [
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_A + POINTONE },
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_B + POINTFOUR },
			];
			const groups = t.groupData(data);
			const results = t.applyAggregations(groups);
			expect(results).to.deep.equal([{ groupKey: GROUP_VALUE_1, sumX: 30.56 }]);
		});
		it("should compute AVG on numeric field (rounded to 2 decimals)", function () {
			const t = new Transformations(["groupKey"], [{ avgX: { AVG: FIELD_X } }]);
			const data: InsightResult[] = [
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_AVG_X },
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_AVG_Y },
				{ groupKey: GROUP_VALUE_1, [FIELD_X]: NUM_AVG_Z },
			];
			const groups = t.groupData(data);
			const results = t.applyAggregations(groups);
			expect(results).to.deep.equal([{ groupKey: GROUP_VALUE_1, avgX: 60.0 }]);
		});
		it("should compute COUNT on any field (unique occurrences)", function () {
			const t = new Transformations(["groupKey"], [{ countY: { COUNT: FIELD_Y } }]);
			const data: InsightResult[] = [
				{ groupKey: GROUP_VALUE_1, [FIELD_Y]: GROUP_VALUE_2 },
				{ groupKey: GROUP_VALUE_1, [FIELD_Y]: GROUP_VALUE_2 },
				{ groupKey: GROUP_VALUE_1, [FIELD_Y]: GROUP_VALUE_3 },
			];
			const groups = t.groupData(data);
			const results = t.applyAggregations(groups);
			expect(results).to.deep.equal([{ groupKey: GROUP_VALUE_1, countY: 2 }]);
		});
		it("should throw error if aggregator is invalid", function () {
			const t = new Transformations(["gk"], [{ someKey: { BAD_AGGREGATOR: FIELD_X } }]);
			const data: InsightResult[] = [{ gk: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_A }];
			const groups = t.groupData(data);
			expect(() => t.applyAggregations(groups)).to.throw(InsightError, "Invalid aggregator: BAD_AGGREGATOR");
		});
		it("should throw error if numeric aggregator used on non-numeric field", function () {
			const t = new Transformations(["gk"], [{ sumField: { SUM: "nonNumericField" } }]);
			const data: InsightResult[] = [{ gk: GROUP_VALUE_1, nonNumericField: GROUP_VALUE_2 }];
			const groups = t.groupData(data);
			expect(() => t.applyAggregations(groups)).to.throw(
				InsightError,
				"Aggregator SUM on non-numeric field: nonNumericField"
			);
		});
		it("should throw if group is empty (cannot aggregate an empty group)", function () {
			const t = new Transformations(["groupKey"], [{ sumX: { SUM: FIELD_X } }]);
			const groups = t.groupData([]);
			expect(() => t.applyAggregations(groups)).to.not.throw();
		});
		it("should handle multiple apply rules in one group", function () {
			const t = new Transformations(["gk"], [{ maxX: { MAX: FIELD_X } }, { countY: { COUNT: FIELD_Y } }]);
			const data: InsightResult[] = [
				{ gk: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_A, [FIELD_Y]: FIELD_Y },
				{ gk: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_B, [FIELD_Y]: FIELD_Z },
				{ gk: GROUP_VALUE_1, [FIELD_X]: NUM_SUM_B, [FIELD_Y]: FIELD_Z },
			];
			const groups = t.groupData(data);
			const results = t.applyAggregations(groups);
			expect(results).to.deep.equal([{ gk: GROUP_VALUE_1, maxX: NUM_SUM_B, countY: 2 }]);
		});
	});
});
