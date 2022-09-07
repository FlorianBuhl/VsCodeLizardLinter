type FunctionAnalysis = {
	name: string,
	cyclomaticComplexity: number,
	numOfParameters: number,
	tokenCount: number
	start: number,
	end: number,
};

type FileAnalysis = {
	filePath: string,
	functionAnalysis: FunctionAnalysis[],
};

class LizardFileAnalysis {

}

export function getFileAnalysis() {

}