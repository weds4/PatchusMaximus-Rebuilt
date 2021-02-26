module.exports = function(xelib, fh, patcherPath, patchFile, settings, helpers, locals){
	const constants = {
		equalTo: `10000000`,
		greaterThanEqualTo: `11000000`
	};
	const Extensions = require(`${patcherPath}/src/PaMaRemadeExtension.js`)(xelib, fh, patcherPath, patchFile, settings, helpers, locals),
		ArmorPatcher = require(`${patcherPath}/src/ArmorPatcher.js`),
		AlchemyPatcher = require(`${patcherPath}/src/AlchemyPatcher.js`);
	return {Extensions, ArmorPatcher, AlchemyPatcher};
};