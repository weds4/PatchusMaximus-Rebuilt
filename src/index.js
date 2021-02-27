const Extensions = require(`${patcherPath}/src/PaMaRemadeExtension.js`),
	ArmorPatcher = require(`${patcherPath}/src/ArmorPatcher.js`),
	AlchemyPatcher = require(`${patcherPath}/src/AlchemyPatcher.js`);

module.exports = function(xelib, fh, patcherPath, patchFile, settings, helpers, locals){
	const constants = {
		equalTo: `10000000`,
		greaterThanEqualTo: `11000000`
	};
	return {
		Extensions: Extensions(xelib, fh, patcherPath, patchFile, settings, helpers, locals),
		ArmorPatcher: ArmorPatcher(xelib, Extensions, constants, patchFile, settings, helpers, locals),
		AlchemyPatcher: AlchemyPatcher(xelib, Extensions, constants, patchFile, settings, helpers, locals)
	};
};