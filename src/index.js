const Extensions = require(`${patcherPath}/src/PaMaRemadeExtension.js`),
	ArmorPatcher = require(`${patcherPath}/src/ArmorPatcher.js`),
	AlchemyPatcher = require(`${patcherPath}/src/AlchemyPatcher.js`);

module.exports = function(args){
	const constants = {
		equalTo: `10000000`,
		greaterThanEqualTo: `11000000`
	};
	args.Extensions = Extensions(args);
	return {
		Extensions: args.Extensions,
		ArmorPatcher: ArmorPatcher(args),
		AlchemyPatcher: AlchemyPatcher(args)
	};
};