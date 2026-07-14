const fixedNow = process.env.SERVICE_TEST_NOW

if (!fixedNow || Number.isNaN(Date.parse(fixedNow))) {
	throw new Error("SERVICE_TEST_NOW must be a valid timestamp when loading the test fixed clock")
}

const RealDate = globalThis.Date

globalThis.Date = class FixedDate extends RealDate {
	constructor(...args) {
		super(...(args.length ? args : [fixedNow]))
	}

	static now() {
		return RealDate.parse(fixedNow)
	}
}
