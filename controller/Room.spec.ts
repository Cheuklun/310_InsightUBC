import { expect } from "chai";
import Room from "../../src/controller/Room";

const TEST_ID = "room1";
const TEST_FULLNAME = "Test Full Name";
const TEST_SHORTNAME = "TEST";
const TEST_NUMBER = "101";
const TEST_ADDRESS = "123 Test St";
const TEST_SEATS = 100;
const TEST_TYPE = "Lecture Hall";
const TEST_FURNITURE = "Fixed Chairs";
const TEST_HREF = "http://example.com";
const TEST_LAT = 49.0;
const TEST_LON = -123.0;

describe("Room Tests", function () {
	it("should construct a Room object with correct properties", function () {
		const room = new Room(
			TEST_ID,
			TEST_FULLNAME,
			TEST_SHORTNAME,
			TEST_NUMBER,
			TEST_ADDRESS,
			TEST_SEATS,
			TEST_TYPE,
			TEST_FURNITURE,
			TEST_HREF,
			TEST_LAT,
			TEST_LON
		);
		expect(room.fullname).to.equal(TEST_FULLNAME);
		expect(room.shortname).to.equal(TEST_SHORTNAME);
		expect(room.number).to.equal(TEST_NUMBER);
		expect(room.address).to.equal(TEST_ADDRESS);
		expect(room.seats).to.equal(TEST_SEATS);
		expect(room.type).to.equal(TEST_TYPE);
		expect(room.furniture).to.equal(TEST_FURNITURE);
		expect(room.href).to.equal(TEST_HREF);
		expect(room.lat).to.equal(TEST_LAT);
		expect(room.lon).to.equal(TEST_LON);
	});
});
