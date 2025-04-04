import { InsightError } from "./IInsightFacade";

//GPT Assisted
export default class MComp {
	public static applyComparator(operator: string, fieldValue: string | number, target: string | number): boolean {
		switch (operator) {
			case "GT":
				return MComp.applyGT(fieldValue, target);
			case "LT":
				return MComp.applyLT(fieldValue, target);
			case "EQ":
				return MComp.applyEQ(fieldValue, target);
			case "IS":
				return MComp.applyIS(fieldValue, target);
			default:
				throw new InsightError("Unsupported comparator operator: " + operator);
		}
	}

	private static applyGT(fieldValue: string | number, target: string | number): boolean {
		if (typeof fieldValue !== "number" || typeof target !== "number") {
			throw new InsightError("GT comparator requires numbers");
		}
		return fieldValue > target;
	}

	private static applyLT(fieldValue: string | number, target: string | number): boolean {
		if (typeof fieldValue !== "number" || typeof target !== "number") {
			throw new InsightError("LT comparator requires numbers");
		}
		return fieldValue < target;
	}

	private static applyEQ(fieldValue: string | number, target: string | number): boolean {
		if (typeof fieldValue !== "number" || typeof target !== "number") {
			throw new InsightError("EQ comparator requires numbers");
		}
		return fieldValue === target;
	}

	private static applyIS(fieldValue: string | number, target: string | number): boolean {
		if (typeof fieldValue !== "string" || typeof target !== "string") {
			throw new InsightError("IS comparator requires strings");
		}

		// Validate that every asterisk in target is either at the beginning or at the end.
		for (let i = 0; i < target.length; i++) {
			if (target[i] === "*") {
				if (i !== 0 && i !== target.length - 1) {
					throw new InsightError("Invalid position of * in IS string");
				}
			}
		}

		const regexStr = "^" + target.replace(/\*/g, ".*") + "$";
		const regex = new RegExp(regexStr);
		return regex.test(fieldValue);
	}
}
