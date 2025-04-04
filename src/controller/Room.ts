export default class Room {
	public readonly name: string;
	public readonly fullname: string;
	public readonly shortname: string;
	public readonly number: string;
	public readonly address: string;
	public readonly seats: number;
	public readonly type: string;
	public readonly furniture: string;
	public readonly href: string;
	public readonly lat: number;
	public readonly lon: number;

	constructor(
		name: string,
		fullname: string,
		shortname: string,
		number: string,
		address: string,
		seats: number,
		type: string,
		furniture: string,
		href: string,
		lat: number,
		lon: number
	) {
		this.name = name;
		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number;
		this.address = address;
		this.seats = seats;
		this.type = type || "";
		this.furniture = furniture || "";
		this.href = href;
		this.lat = lat;
		this.lon = lon;
	}
}
