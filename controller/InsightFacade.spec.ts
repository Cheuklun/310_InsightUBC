import {
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	describe("addDataset", function () {
		let sections: string; //pair
		let invSections: string; //invalid section
		let noCourseSections: string; //no courses folder
		let singSections: string; //one course
		let doubSections: string; //two courses
		let sectionsEmp: string; //empty zip
		let sectionsEmpC: string; //empty courses
		let rooms: string;
		let facade: InsightFacade;
		before(async function () {
			sections = await getContentFromArchives("pair.zip");
			sectionsEmp = await getContentFromArchives("emptyZip.zip");
			sectionsEmpC = await getContentFromArchives("emptyCourses.zip");
			singSections = await getContentFromArchives("singCourse.zip");
			doubSections = await getContentFromArchives("twoValidCourse.zip");
			invSections = await getContentFromArchives("invalidSection.zip");
			noCourseSections = await getContentFromArchives("noCoursesFolder.zip");
			rooms = await getContentFromArchives("campus.zip");
			await clearDisk();
			facade = new InsightFacade();
		});

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);

				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should successfully add a dataset (first)", async function () {
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			expect(result).to.have.members(["ubc"]);
		});

		it("should successfully add a dataset (second)", async function () {
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			return expect(result).to.have.members(["ubc"]);
		});

		// invalid underscore reject tests
		it("should reject with a dataset id containing an underscore", async function () {
			try {
				await facade.addDataset("ubc_", singSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset id containing multiple underscores", async function () {
			try {
				await facade.addDataset("_ubc__inv", singSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//whitespace tests
		it("should reject with a whitespace id (only whitespace chars from section specs", async function () {
			try {
				await facade.addDataset("  ", singSections, InsightDatasetKind.Sections);

				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//reject duplicates (made with AI assistant to autofill)
		it("should reject with a duplicate dataset id that exists in all sections", async function () {
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if the zip file is empty", async function () {
			try {
				await facade.addDataset("emp", sectionsEmp, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if courses are empty", async function () {
			try {
				await facade.addDataset("emp", sectionsEmpC, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if folder is not named courses", async function () {
			try {
				await facade.addDataset("invalid", noCourseSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if the section dataset for the param is invalid", async function () {
			try {
				await facade.addDataset("invalid", "invalid", InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if the base 64 string is invalid", async function () {
			try {
				await facade.addDataset("_invalid", doubSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if the section in the zip is invalid", async function () {
			try {
				await facade.addDataset("invalid", invSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should pass on valid test case", async function () {
			try {
				const result = await facade.addDataset("valid", singSections, InsightDatasetKind.Sections);
				expect(result).to.deep.equal(["valid"]);
			} catch (_err) {
				expect.fail("Should have passed!");
			}
		});

		it("should pass on a valid rooms test case", async function () {
			try {
				const result = await facade.addDataset("valid", rooms, InsightDatasetKind.Rooms);
				expect(result).to.deep.equal(["valid"]);
			} catch (err) {
				expect.fail("Should not have thrown error above. " + err);
			}
		});
	});
	describe("listDatasets", function () {
		let singSections: string; //one course
		let doubSections: string; //two courses
		let rooms: string;
		let facade: InsightFacade;

		before(async function () {
			singSections = await getContentFromArchives("singCourse.zip");
			doubSections = await getContentFromArchives("twoValidCourse.zip");
			rooms = await getContentFromArchives("campus.zip");
		});

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should be undefined if no datasets are added", async function () {
			const result = await facade.listDatasets();
			const resultDataset = result.find((dataset) => dataset.id === "ANTH378");
			expect(resultDataset).to.equal(undefined);
		});

		// test for one dataset added
		it("should return a id of datasets after adding one", async function () {
			try {
				// Add a dataset to the facade
				await facade.addDataset("ANTH378", singSections, InsightDatasetKind.Sections);
				const result = await facade.listDatasets();
				const resultDataset = result.find((dataset) => dataset.id === "ANTH378");
				expect(resultDataset).to.have.property("kind", InsightDatasetKind.Sections);
				expect(resultDataset).to.have.property("id", "ANTH378");
			} catch (_err) {
				//DYK _ is to show err is undeclared
				expect.fail("Should have passed!");
			}
		});

		it("should return with the ids of section's datasets after adding one", async function () {
			try {
				await facade.addDataset("ADD123", doubSections, InsightDatasetKind.Sections);
				const result = await facade.listDatasets();
				const resultDataset = result.find((dataset) => dataset.id === "ADD123");
				expect(resultDataset).to.have.property("kind", InsightDatasetKind.Sections);
				expect(resultDataset).to.have.property("id", "ADD123");
			} catch (_err) {
				expect.fail("Should have passed!");
			}
		});

		it("should return with the ids of rooms datasets after adding one", async function () {
			try {
				await facade.addDataset("ADD123", rooms, InsightDatasetKind.Rooms);
				const result = await facade.listDatasets();
				const resultDataset = result.find((dataset) => dataset.id === "ADD123");
				expect(resultDataset).to.have.property("kind", InsightDatasetKind.Rooms);
				expect(resultDataset).to.have.property("id", "ADD123");
			} catch (_err) {
				expect.fail("Should have passed!");
			}
		});

		it("should return with the id of the 2 rooms dataset added", async function () {
			try {
				await facade.addDataset("ADD123", rooms, InsightDatasetKind.Rooms);
				const result = await facade.listDatasets();
				const resultDataset = result.find((dataset) => dataset.id === "ADD123");
				expect(resultDataset).to.have.property("kind", InsightDatasetKind.Rooms);
				expect(resultDataset).to.have.property("id", "ADD123");
				await facade.addDataset("ADD321", rooms, InsightDatasetKind.Rooms);
				const result2 = await facade.listDatasets();
				const resultDataset2 = result2.find((dataset) => dataset.id === "ADD321");
				expect(resultDataset2).to.have.property("kind", InsightDatasetKind.Rooms);
				expect(resultDataset2).to.have.property("id", "ADD321");
			} catch (err) {
				expect.fail("Should have passed!" + err);
			}
		});

		it("should successfully list all datasets from old facades", async () => {
			let result;
			try {
				await facade.addDataset("123", doubSections, InsightDatasetKind.Sections);
				const facade2 = new InsightFacade();
				await facade2.addDataset("ABC", rooms, InsightDatasetKind.Rooms);
				result = await facade2.listDatasets();
			} catch (err) {
				result = err;
			}
			const two = 2;
			return expect(result).to.be.an("array").with.lengthOf(two);
		});

		// test for correct dataset details
	});
	describe("RemoveDataset", function () {
		let singSections: string; //one course
		let doubSections: string; //two courses
		let facade: InsightFacade;

		before(async function () {
			singSections = await getContentFromArchives("singCourse.zip");
			doubSections = await getContentFromArchives("twoValidCourse.zip");
		});

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		//empty dataset reject
		it("should reject removal with an empty dataset id", async function () {
			try {
				try {
					await facade.addDataset("validid", singSections, InsightDatasetKind.Sections);
				} catch (_err) {
					expect.fail("Should have passed!");
				}
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset id containing an underscore:", async function () {
			try {
				try {
					await facade.addDataset("validid", doubSections, InsightDatasetKind.Sections);
				} catch (_err) {
					expect.fail("Should not have thrown error above.");
				}
				await facade.removeDataset("invalid_id");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a dataset id containing only whitespace characters:", async function () {
			try {
				try {
					await facade.addDataset("valid", doubSections, InsightDatasetKind.Sections);
				} catch (_err) {
					expect.fail("Should not have thrown error above.");
				}
				await facade.removeDataset("   ");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject if the dataset has not been added:", async function () {
			try {
				await facade.removeDataset("invalid");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject when trying to remove a dataset already removed", async function () {
			try {
				try {
					await facade.addDataset("valid", doubSections, InsightDatasetKind.Sections);
				} catch (_err) {
					expect.fail("Should not have thrown error above.");
				}
				await facade.removeDataset("valid");
				await facade.removeDataset("valid");
				expect.fail("Should have thrown error above.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should pass on a valid test case", async function () {
			try {
				const id = "valid";
				await facade.addDataset(id, doubSections, InsightDatasetKind.Sections);
				const result = await facade.removeDataset(id);
				expect(result).to.equal(id);
			} catch (_err) {
				expect.fail("Should not have thrown error above.");
			}
		});

		it("should pass on a valid test case where two courses get removed so none remain", async function () {
			try {
				const id1 = "valid1";
				const id2 = "valid2";
				await facade.addDataset(id1, doubSections, InsightDatasetKind.Sections);
				await facade.addDataset(id2, doubSections, InsightDatasetKind.Sections);
				const result1 = await facade.removeDataset(id1);
				const result2 = await facade.removeDataset(id2);
				expect(result1).to.equal(id1);
				expect(result2).to.equal(id2);
			} catch (_err) {
				expect.fail("Should not have thrown error above.");
			}
		});
	});

	describe("PerformQuery", function () {
		let facade: InsightFacade;
		let sections: string;
		let rooms: string;

		// Load dataset content before any tests run.
		before(async function () {
			sections = await getContentFromArchives("pair.zip");
			rooms = await getContentFromArchives("campus.zip");
		});

		// Helper function to run the test queries.
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery. " +
						"Usage: 'checkQuery' must be passed as the callback to Mocha's it() function."
				);
			}

			// Load the test query data based on the test title.
			let testQuery;
			try {
				testQuery = await loadTestQuery(this.test.title);
			} catch (err) {
				throw new Error("Error loading test query: " + err);
			}
			const { input, expected, errorExpected } = testQuery;
			let result: InsightResult[];
			// Call performQuery and assert the expected result.
			try {
				result = await facade.performQuery(input);
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}
				// console.log(...result);
				// console.log(...expected);
				// console.log(JSON.stringify(result) === JSON.stringify(expected));
				expect(result).to.deep.equal(expected);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "InsightError") {
					expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "ResultTooLargeError") {
					expect(err).to.be.instanceOf(ResultTooLargeError);
				} else {
					expect.fail(`performQuery threw an error of an unexpected type: ${err}`);
				}
			}
		}

		// Create the InsightFacade instance and add datasets before tests run.
		before(async function () {
			facade = new InsightFacade();
			try {
				await Promise.all([
					facade.addDataset("sections", sections, InsightDatasetKind.Sections),
					facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms),
				]);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added: ${err}`);
			}
		});

		// Cleanup after tests.
		after(async function () {
			await clearDisk();
		});

		// Test case to ensure performQuery rejects invalid query types.
		it("should reject with an invalid query (not an object)", async function () {
			const INVALID_NUMBER = 35;
			const invalidQueries = ["not an obj", INVALID_NUMBER, null, undefined, true, []];
			const promises = invalidQueries.map(async (query) => {
				try {
					await facade.performQuery(query);
					expect.fail("Should have thrown for query: " + JSON.stringify(query));
				} catch (err) {
					expect(err).to.be.instanceOf(InsightError);
				}
			});
			await Promise.all(promises);
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		//invalid section
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/invalid.json] ANDisEmpty", checkQuery);
		it("[invalid/invalid.json] COLUMNSIsEmpty", checkQuery);
		it("[invalid/invalid.json] cOLUMNSIsMissing", checkQuery);
		it("[invalid/asterisksDoubleEndDept.json] asteriskDoubleEndDept", checkQuery);
		it("[invalid/asterisksDoubleStartDept.json] asteriskDoubleStartDept", checkQuery);
		it("[invalid/asterisksMiddleDept.json] asteriskMiddleDept", checkQuery);
		it("[invalid/datasetNotAdded.json] datasetNotAdded", checkQuery);
		it("[invalid/invalidDatatype.json] invalidDatatype", checkQuery);
		it("[invalid/invalidFilter.json] invalidFilter", checkQuery);
		it("[invalid/invalidKey.json] invalidKey", checkQuery);
		it("[invalid/keysMustBeValidInColumns.json] keysMustBeValidInColumns", checkQuery);
		it("[invalid/missingIS.json] missingIS", checkQuery);
		it("[invalid/missingOptions.json] missingOptions", checkQuery);
		it("[invalid/missingWhere.json] missingWhere", checkQuery);
		it("[invalid/orderNotInColumns.json] orderNotInColumns", checkQuery);
		it("[invalid/resultTooBig.json] resultTooBig", checkQuery);
		it("[invalid/resultTooLargeWithAnd.json] resultTooLargeWithAnd", checkQuery);
		it("[invalid/sectionsDoubUnderscore.json] sectionsDoubUnderscore", checkQuery);
		it("[invalid/sectionsTripUnderscore.json] sectionsTripUnderscore", checkQuery);
		it("[invalid/twoOrMoreDataset.json] twoOrMoreDataset", checkQuery);
		it("[invalid/doubUnderscoreColumns.json] doubUnderscoreColumns", checkQuery);
		it("[invalid/doubUnderscoreOrder.json] doubUnderscoreOrder", checkQuery);
		it("[invalid/emptyStringDataset.json] emptyStringDataset", checkQuery);
		it("[invalid/invalidKeyEQ.json] invalidKeyEQ", checkQuery);
		it("[invalid/invalidKeyGT.json] invalidKeyGT", checkQuery);
		it("[invalid/invalidKeyLT.json] invalidKeyLT", checkQuery);
		it("[invalid/missingColumnsAll.json] missingColumnsAll", checkQuery);
		it("[invalid/noUnderscoreColumn.json] noUnderscoreColumn", checkQuery);
		it("[invalid/noUnderscoreOrder.json] noUnderscoreOrder", checkQuery);
		it("[invalid/noUnderscoreWhere.json] noUnderscoreWhere", checkQuery);
		it("[invalid/orderKeyNotInColumns.json] orderKeyNotInColumns", checkQuery);

		//valid section
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/asteriskFirstANDLast.json] asteriskFirstANDLast", checkQuery);
		it("[valid/asterisksGetValidDept.json] asterisksGetValidDept", checkQuery);
		it("[valid/getAllCourseSections.json] getAllCourseSections", checkQuery);
		it("[valid/getAllDeptSections.json] getAllDeptSections", checkQuery);
		it("[valid/getAllSameNumSections.json] getAllSameNumSections", checkQuery);
		it("[valid/getOneSection.json] getOneSection", checkQuery);
		it("[valid/validOR.json] validOR", checkQuery);
		it("[valid/auditCheck.json] auditCheck", checkQuery);
		it("[valid/complexNOT.json] complexNOT", checkQuery);
		it("[valid/nestedAND.json] nestedAND", checkQuery);
		it("[valid/nestedANDinOR.json] nestedANDinOR", checkQuery);
		it("[valid/nestedOR.json] nestedOR", checkQuery);
		it("[valid/nestedORinAND.json] nestedORinAND", checkQuery);
		it("[valid/simpleNOTAND.json] simpleNOTAND", checkQuery);
		it("[valid/validANDEQEQ.json] validANDEQEQ", checkQuery);
		it("[valid/validANDEQGT.json] validANDEQGT", checkQuery);
		it("[valid/validANDEQLT.json] validANDEQLT", checkQuery);
		it("[valid/validANDGTEQ.json] validANDGTEQ", checkQuery);
		it("[valid/validANDGTGT.json] validANDGTGT", checkQuery);
		it("[valid/validANDGTLT.json] validANDGTLT", checkQuery);
		it("[valid/validANDLTEQ.json] validANDLTEQ", checkQuery);
		it("[valid/validANDLTGT.json] validANDLTGT", checkQuery);
		it("[valid/validANDLTLT.json] validANDLTLT", checkQuery);
		it("[valid/validNoOrder.json] validNoOrder", checkQuery);
		it("[valid/validOrLTEQ.json] validOrLTEQ", checkQuery);
		// it("[valid/sectionsWhereAvgQuery.json] sectionsWhereAvgQuery", checkQuery);
		// it("[valid/sectionsWhereAvgQuery.json] sectionsAvgYearQuery", checkQuery);
		// it("[valid/sectionsWhereAvgQuery.json] sectionsWhereAvgQuery", checkQuery);

		//invalid room
		it("[invalid/roomInvalidKey.json] roomInvalidKey", checkQuery); //0
		it("[invalid/roomInvalidOrderKey.json] roomInvalidOrderKey", checkQuery);
		it("[invalid/roomAggregatorOnString.json] roomAggregatorOnString", checkQuery); //1
		it("[invalid/roomApplyDuplicate.json] roomApplyDuplicate", checkQuery); //2
		it("[invalid/roomInvalidColumnKey.json] roomInvalidColumnKey", checkQuery); //3
		it("[invalid/roomInvalidWhere.json] roomInvalidWhere", checkQuery); //4
		it("[invalid/roomInvalidWildcard.json] roomInvalidWildcard", checkQuery); //5
		it("[invalid/roomMissingColumn.json] roomMissingColumn", checkQuery); //6
		it("[invalid/roomMultiDataset.json] roomMultiDataset", checkQuery); //7
		it("[invalid/roomNoGroup.json] roomNoGroup", checkQuery); //8
		it("[invalid/roomZeroApplyKey.json] roomZeroApplyKey", checkQuery); //9
		it("should reject a bad query", function () {
			const result = facade.performQuery("invalid_query");
			return expect(result).to.be.rejectedWith(InsightError);
		});

		//valid room
		it("[valid/roomAndOr.json] roomAndOr", checkQuery);
		it("[valid/roomApplyComplex.json] roomApplyComplex", checkQuery);
		it("[valid/roomApplyMaxAvgSum.json] roomApplyMaxAvgSum", checkQuery);
		it("[valid/roomDoubleSortObjects.json] roomDoubleSortObjects", checkQuery);
		it("[valid/roomMultiGroup.json] roomMultiGroup", checkQuery);
		it("[valid/roomBasic.json] roomBasic", checkQuery);
		it("[valid/roomNotAndLess.json] roomNotAndLess", checkQuery);
		it("[valid/roomNestedAndOrGTIS.json] roomNestedAndOrGTIS", checkQuery);
		it("[valid/roomNoFilterSumCount.json] roomNoFilterSumCount", checkQuery);
		it("[valid/roomGroupCount.json] roomGroupCount", checkQuery);
		it("[valid/roomGroupMin.json] roomGroupMin", checkQuery);
		it("[valid/roomNestedAndOrNot.json] roomNestedAndOrNot", checkQuery);
		it("[valid/roomOrderObject.json] roomOrderObject", checkQuery);
		it("[valid/room-AverageSum.json] averageSumRoom", checkQuery);
		it("[valid/room-MaxCapacity.json] maxCapacityRoom", checkQuery);
		it("[valid/roomCountFurniture.json] roomCountFurniture", checkQuery);
		it("[valid/roomFilterAndSumSeats.json] roomFilterAndSumSeats", checkQuery);
		it("[valid/roomMinSeats.json] minSeats", checkQuery);
		it("[valid/roomWildCardTest.json] roomWildCardTest", checkQuery);
		it("[valid/roomTestQuerySample.json] roomTestQuerySample", checkQuery);
		it("[valid/validAVG.json] correct room query and avg", checkQuery);
		it("[valid/validCOUNT.json] correct room query and count", checkQuery);
		it("[valid/validNoResult.json] returns no result", checkQuery);
		it("[valid/validGeolocation.json] correct room query with lat", checkQuery);
		it("[valid/validSumDiffGroup.json] room query with summing and an atypical grouping", checkQuery);
		it("[valid/validNestedRoom.json] nested function for room", checkQuery);
		it("[valid/validMaxQuery.json] max function", checkQuery);
		it("[valid/workingRoomMin.json] min function", checkQuery);
		it("[valid/workingRoomSum.json] sum function", checkQuery);
		it("[valid/roomApplyGroupMin.json] roomApplyGroupMin", checkQuery);
	});
});
