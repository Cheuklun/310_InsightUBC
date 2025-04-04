export default class Section {
	private readonly uuid: string;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;

	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;

	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	) {
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}

	public getSectionID(): string {
		return this.uuid;
	}

	public getTitle(): string {
		return this.title;
	}

	public getCourseID(): string {
		return this.id;
	}

	public getInstructor(): string {
		return this.instructor;
	}

	public getDepartment(): string {
		return this.dept;
	}

	public getYear(): number {
		return this.year;
	}

	public getAudit(): number {
		return this.audit;
	}

	public getAvg(): number {
		return this.avg;
	}

	public getPass(): number {
		return this.pass;
	}

	public getFail(): number {
		return this.fail;
	}
}
