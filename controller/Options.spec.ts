import { expect } from "chai";
import { InsightError, InsightResult } from "../../src/controller/IInsightFacade";
import Options from "../../src/controller/Options";
import Section from "../../src/controller/Section";
import Room from "../../src/controller/Room";

const DEFAULT_YEAR = 2020;
const DEFAULT_PASS = 50;
const DEFAULT_FAIL = 2;
const DEFAULT_AUDIT = 1;
const SECTION_AVG_EXAMPLE = 88.88;
const SECTION_YEAR_2015 = 2015;
const SECTION_YEAR_1990 = 1990;
const SECTION_AVG_ROUND = 88.8888;
const EightyEight = 88;
const EXPECTED_ROUNDED_AVG = 88.89;
const ROOM_SEATS_100 = 100;
const ROOM_SEATS_200 = 200;
const ROOM_LAT_49_0 = 49.0;
const ROOM_LON_MINUS_123_0 = -123.0;
const ROOM_LAT_49_2 = 49.2;
const ROOM_LON_MINUS_123_1 = -123.1;
const AGGREGATED_MAX_SEATS = 442;
const ONETWOTHREE = 123;

describe("Options Tests", function () {
	describe("Constructor Validation", function () {
		it("should throw an error if the options input is not an object", function () {
			const invalidInputs = [undefined, null, "string", ONETWOTHREE];
			for (const input of invalidInputs) {
				expect(() => new Options(input)).to.throw(InsightError, "OPTIONS clause is invalid");
			}
		});
		it("should throw an error if COLUMNS is missing", function () {
			const input = { ORDER: "fake" };
			expect(() => new Options(input)).to.throw(InsightError, "OPTIONS missing COLUMNS");
		});
		it("should throw an error if COLUMNS is empty", function () {
			const input = { COLUMNS: [] };
			expect(() => new Options(input)).to.throw(InsightError);
		});
		it("should construct successfully if only COLUMNS is valid", function () {
			const input = { COLUMNS: ["rooms_shortname"] };
			expect(() => new Options(input)).to.not.throw();
			const o = new Options(input);
			expect(o.columns).to.deep.equal(["rooms_shortname"]);
			expect(o.order).to.equal(undefined);
		});
	});
	describe("ORDER Validation (string)", function () {
		it("should throw if ORDER is not in columns", function () {
			const input = { COLUMNS: ["rooms_shortname"], ORDER: "rooms_seats" };
			expect(() => new Options(input)).to.throw(InsightError, "ORDER key must be in COLUMNS");
		});
		it("should throw if ORDER has invalid underscore format", function () {
			const input = { COLUMNS: ["rooms_shortname"], ORDER: "rooms_invalid_format_here" };
			expect(() => new Options(input)).to.throw(InsightError, "Invalid ORDER key format");
		});
		it("should construct if ORDER is a string and is in columns", function () {
			const input = { COLUMNS: ["rooms_shortname"], ORDER: "rooms_shortname" };
			expect(() => new Options(input)).to.not.throw();
			const o = new Options(input);
			expect(o.order).to.equal("rooms_shortname");
		});
	});
	describe("ORDER Validation (object)", function () {
		it("should throw if dir is not UP or DOWN", function () {
			const input = {
				COLUMNS: ["rooms_shortname", "rooms_seats"],
				ORDER: { dir: "SIDEWAYS", keys: ["rooms_shortname"] },
			};
			expect(() => new Options(input)).to.throw(InsightError, "ORDER direction must be UP or DOWN");
		});
		it("should throw if keys array is empty", function () {
			const input = { COLUMNS: ["rooms_shortname", "rooms_seats"], ORDER: { dir: "UP", keys: [] } };
			expect(() => new Options(input)).to.throw(InsightError, "ORDER keys must be a non-empty array");
		});
		it("should throw if a key in keys is not in columns", function () {
			const input = { COLUMNS: ["rooms_shortname"], ORDER: { dir: "DOWN", keys: ["rooms_seats"] } };
			expect(() => new Options(input)).to.throw(InsightError, "ORDER key must be in COLUMNS");
		});
		it("should throw if a key in keys has invalid underscore format", function () {
			const input = { COLUMNS: ["rooms_shortname"], ORDER: { dir: "UP", keys: ["rooms_wrong_format_here"] } };
			expect(() => new Options(input)).to.throw(InsightError, "Invalid ORDER key format");
		});
		it("should construct if everything is valid", function () {
			const input = { COLUMNS: ["rooms_shortname", "rooms_seats"], ORDER: { dir: "DOWN", keys: ["rooms_shortname"] } };
			expect(() => new Options(input)).to.not.throw();
			const o = new Options(input);
			expect(o.order).to.deep.equal({ dir: "DOWN", keys: ["rooms_shortname"] });
		});
	});
	describe("getField Tests", function () {
		it("should return the property from an aggregated result (plain object)", function () {
			const aggregatedRow: InsightResult = { rooms_shortname: "OSBO", maxSeats: AGGREGATED_MAX_SEATS };
			const val = Options.getField(aggregatedRow, "maxSeats");
			expect(val).to.equal(AGGREGATED_MAX_SEATS);
		});
		it("should return the property from a Section with no underscores", function () {
			const sec = new Section(
				"uuid",
				"dummy",
				"title",
				"instr",
				"dept",
				DEFAULT_YEAR,
				SECTION_AVG_EXAMPLE,
				DEFAULT_PASS,
				DEFAULT_FAIL,
				DEFAULT_AUDIT
			);
			const val = Options.getField(sec, "somethingNoUnderscore");
			expect(val).to.equal(undefined);
		});
		it("should throw if underscore format is invalid", function () {
			const sec = new Section(
				"uuid",
				"dummy",
				"title",
				"instr",
				"dept",
				DEFAULT_YEAR,
				SECTION_AVG_EXAMPLE,
				DEFAULT_PASS,
				DEFAULT_FAIL,
				DEFAULT_AUDIT
			);
			expect(() => Options.getField(sec, "sections_invalid_more_than_2_parts")).to.throw(
				InsightError,
				"Invalid column key: sections_invalid_more_than_2_parts"
			);
		});
		it("should return the correct field from a Section (sections_avg)", function () {
			const sec = new Section(
				"u",
				"cpsc310",
				"title",
				"prof",
				"cpsc",
				SECTION_YEAR_2015,
				SECTION_AVG_EXAMPLE,
				DEFAULT_PASS,
				DEFAULT_FAIL,
				DEFAULT_AUDIT
			);
			const val = Options.getField(sec, "sections_avg");
			expect(val).to.equal(SECTION_AVG_EXAMPLE);
		});
		it("should throw error if no mapping found", function () {
			const sec = new Section(
				"u",
				"cpsc310",
				"title",
				"prof",
				"cpsc",
				SECTION_YEAR_2015,
				EightyEight,
				DEFAULT_PASS,
				DEFAULT_FAIL,
				DEFAULT_AUDIT
			);
			expect(() => Options.getField(sec, "sections_xyz")).to.throw(InsightError, "Unknown field: xyz");
		});
		it("should round .avg to two decimals if a number", function () {
			const sec = new Section(
				"u",
				"id",
				"title",
				"prof",
				"dep",
				SECTION_YEAR_1990,
				SECTION_AVG_ROUND,
				DEFAULT_PASS,
				DEFAULT_FAIL,
				DEFAULT_AUDIT
			);
			const val = Options.getField(sec, "sections_avg");
			expect(val).to.equal(EXPECTED_ROUNDED_AVG);
		});
	});
	describe("applyOptions Tests", function () {
		it("should map each object into an InsightResult with specified columns", function () {
			const input = { COLUMNS: ["rooms_shortname", "rooms_seats"] };
			const o = new Options(input);
			const rooms: Room[] = [
				new Room(
					"RM1",
					"FullName1",
					"Short1",
					"101",
					"addr1",
					ROOM_SEATS_100,
					"type1",
					"furn1",
					"href1",
					ROOM_LAT_49_0,
					ROOM_LON_MINUS_123_0
				),
				new Room(
					"RM2",
					"FullName2",
					"Short2",
					"202",
					"addr2",
					ROOM_SEATS_200,
					"type2",
					"furn2",
					"href2",
					ROOM_LAT_49_2,
					ROOM_LON_MINUS_123_1
				),
			];
			const results = o.applyOptions(rooms);
			expect(results).to.deep.equal([
				{ rooms_shortname: "Short1", rooms_seats: ROOM_SEATS_100 },
				{ rooms_shortname: "Short2", rooms_seats: ROOM_SEATS_200 },
			]);
		});
		it("should apply string ORDER sorting if given", function () {
			const input = { COLUMNS: ["rooms_shortname", "rooms_seats"], ORDER: "rooms_shortname" };
			const o = new Options(input);
			const data: InsightResult[] = [
				{ rooms_shortname: "ZETA", rooms_seats: ROOM_SEATS_100 },
				{ rooms_shortname: "ALPHA", rooms_seats: ROOM_SEATS_200 },
			];
			const results = o.applyOptions(data);
			expect(results).to.deep.equal([
				{ rooms_shortname: "ALPHA", rooms_seats: ROOM_SEATS_200 },
				{ rooms_shortname: "ZETA", rooms_seats: ROOM_SEATS_100 },
			]);
		});
		it("should apply object ORDER sorting if given", function () {
			const input = {
				COLUMNS: ["rooms_shortname", "rooms_seats"],
				ORDER: { dir: "DOWN", keys: ["rooms_seats", "rooms_shortname"] },
			};
			const o = new Options(input);
			const data: InsightResult[] = [
				{ rooms_shortname: "ALPHA", rooms_seats: ROOM_SEATS_100 },
				{ rooms_shortname: "ZETA", rooms_seats: ROOM_SEATS_100 },
				{ rooms_shortname: "BETA", rooms_seats: ROOM_SEATS_200 },
				{ rooms_shortname: "GAMMA", rooms_seats: 10 },
			];
			const results = o.applyOptions(data);
			expect(results).to.deep.equal([
				{ rooms_shortname: "BETA", rooms_seats: ROOM_SEATS_200 },
				{ rooms_shortname: "ZETA", rooms_seats: ROOM_SEATS_100 },
				{ rooms_shortname: "ALPHA", rooms_seats: ROOM_SEATS_100 },
				{ rooms_shortname: "GAMMA", rooms_seats: 10 },
			]);
		});
	});
});
