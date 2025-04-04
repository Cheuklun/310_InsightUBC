import { expect } from "chai";
import Section from "../../src/controller/Section";

const TEST_UUID = "sec1";
const TEST_COURSE_ID = "CPSC310";
const TEST_TITLE = "Intro to Testing";
const TEST_INSTRUCTOR = "Dr. Tester";
const TEST_DEPARTMENT = "CPSC";
const TEST_YEAR = 2020;
const TEST_AVG = 85.5;
const TEST_PASS = 60;
const TEST_FAIL = 5;
const TEST_AUDIT = 2;

describe("Section Tests", function () {
	it("should construct a Section object with correct properties", function () {
		const sec = new Section(
			TEST_UUID,
			TEST_COURSE_ID,
			TEST_TITLE,
			TEST_INSTRUCTOR,
			TEST_DEPARTMENT,
			TEST_YEAR,
			TEST_AVG,
			TEST_PASS,
			TEST_FAIL,
			TEST_AUDIT
		);
		expect(sec.getSectionID()).to.equal(TEST_UUID);
		expect(sec.getCourseID()).to.equal(TEST_COURSE_ID);
		expect(sec.getTitle()).to.equal(TEST_TITLE);
		expect(sec.getInstructor()).to.equal(TEST_INSTRUCTOR);
		expect(sec.getDepartment()).to.equal(TEST_DEPARTMENT);
		expect(sec.getYear()).to.equal(TEST_YEAR);
		expect(sec.getAvg()).to.equal(TEST_AVG);
		expect(sec.getPass()).to.equal(TEST_PASS);
		expect(sec.getFail()).to.equal(TEST_FAIL);
		expect(sec.getAudit()).to.equal(TEST_AUDIT);
	});
});
