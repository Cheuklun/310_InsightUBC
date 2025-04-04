// import { expect } from "chai";
// import request from "supertest";
// import { StatusCodes } from "http-status-codes";
// import { Log } from "@ubccpsc310/project-support";
//
// describe("Facade C3", function () {
// 	before(function () {
// 		// TODO: start server here once and handle errors properly
// 	});
//
// 	after(function () {
// 		// TODO: stop server here once!
// 	});
//
// 	beforeEach(function () {
// 		// might want to add some process logging here to keep track of what is going on
// 	});
//
// 	afterEach(function () {
// 		// might want to add some process logging here to keep track of what is going on
// 	});
//
// 	// Sample on how to format PUT requests
// 	it("PUT test for courses dataset", async function () {
// 		const SERVER_URL = "TBD";
// 		const ENDPOINT_URL = "TBD";
// 		const ZIP_FILE_DATA = "TBD";
//
// 		try {
// 			const res = await request(SERVER_URL)
// 				.put(ENDPOINT_URL)
// 				.send(ZIP_FILE_DATA)
// 				.set("Content-Type", "application/x-zip-compressed");
// 			expect(res.status).to.be.equal(StatusCodes.OK);
// 			// TODO add assertions that check res.body
// 		} catch (err) {
// 			Log.error(err);
// 			expect.fail();
// 		}
// 	});
//
// 	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
// });

import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Log } from "@ubccpsc310/project-support";
import fs from "fs";
import path from "path";
import Server from "../../src/rest/Server";

describe("InsightFacade API C3", function () {
	let server: Server;
	const PORT = 4321;
	const SERVER_URL = `http://localhost:${PORT}`;
	let validSectionZip: string;
	let validRoomZip: string;

	before(async function () {
		Log.test(`Starting server on port ${PORT}`);
		server = new Server(PORT);
		try {
			await server.start();
			const archivesDir = path.join(__dirname, "..", "resources", "archives");
			validSectionZip = (await fs.promises.readFile(path.join(archivesDir, "pair.zip"))).toString("base64");
			validRoomZip = (await fs.promises.readFile(path.join(archivesDir, "campus.zip"))).toString("base64");
		} catch (err) {
			Log.error(`Failed to load test data: ${err}`);
			throw err;
		}
	});

	after(async function () {
		Log.test("Stopping server");
		try {
			await server.stop();
		} catch (err) {
			Log.error(`Failed to stop server: ${err}`);
			throw err;
		}
	});

	beforeEach(function () {
		Log.test(`Starting test: ${this.currentTest?.title}`);
	});

	afterEach(function () {
		Log.test(`Finished test: ${this.currentTest?.title}`);
	});

	describe("Dataset Endpoints", function () {
		it("should add a valid sections dataset", async function () {
			const res = await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(validSectionZip)
				.set("Content-Type", "application/x-zip-compressed");
			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array").that.includes("sections");
		});

		it("should add a valid rooms dataset", async function () {
			const res = await request(SERVER_URL)
				.put("/dataset/rooms/rooms")
				.send(validRoomZip)
				.set("Content-Type", "application/x-zip-compressed");
			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array").that.includes("rooms");
		});

		it("should reject invalid dataset kind", async function () {
			const res = await request(SERVER_URL)
				.put("/dataset/invalid/invalid_kind")
				.send(validSectionZip)
				.set("Content-Type", "application/x-zip-compressed");
			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			expect(res.body).to.have.property("error");
		});

		it("should reject empty dataset content", async function () {
			const res = await request(SERVER_URL)
				.put("/dataset/empty/sections")
				.send("")
				.set("Content-Type", "application/x-zip-compressed");
			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
		});
	});

	describe("List Datasets", function () {
		before(async function () {
			await request(SERVER_URL)
				.put("/dataset/list_test/sections")
				.send(validSectionZip)
				.set("Content-Type", "application/x-zip-compressed");
		});

		it("should list all datasets", async function () {
			const res = await request(SERVER_URL).get("/datasets");
			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array");
			expect(res.body.result.some((d: any) => d.id === "list_test")).to.be.true;
		});
	});

	describe("Remove Dataset", function () {
		beforeEach(async function () {
			await request(SERVER_URL)
				.put("/dataset/to_remove/sections")
				.send(validSectionZip)
				.set("Content-Type", "application/x-zip-compressed");
		});

		it("should remove an existing dataset", async function () {
			const res = await request(SERVER_URL).delete("/dataset/to_remove");
			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result", "to_remove");
		});

		it("should reject removing non-existent dataset", async function () {
			const res = await request(SERVER_URL).delete("/dataset/non_existent");
			expect(res.status).to.equal(StatusCodes.NOT_FOUND);
			expect(res.body).to.have.property("error");
		});
	});

	describe("Query Endpoint", function () {
		before(async function () {
			await request(SERVER_URL)
				.put("/dataset/query_test/sections")
				.send(validSectionZip)
				.set("Content-Type", "application/x-zip-compressed");
		});

		it("should execute a simple query", async function () {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["query_test_dept", "query_test_avg"],
					ORDER: "query_test_avg",
				},
			};
			const res = await request(SERVER_URL).post("/query").send(query);
			expect(res.status).to.equal(StatusCodes.OK);
			expect(res.body).to.have.property("result");
			expect(res.body.result).to.be.an("array");
			expect(res.body.result[0]).to.have.all.keys("query_test_dept", "query_test_avg");
		});

		it("should reject invalid query format", async function () {
			const res = await request(SERVER_URL).post("/query").send({ invalid: "query" });
			expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
			expect(res.body).to.have.property("error");
		});
	});
});
