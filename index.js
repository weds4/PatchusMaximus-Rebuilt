//User can choose these (need settings.html, I guess?)
let UseWarrior = true, UseThief = true, UseMage = true;
const src = require(`${patcherPath}/src`);

function executePatchusMaximus(patchFile, helpers, settings, locals){
	let args = {xelib, fh, patcherPath, patchFile, settings, helpers, locals}
	const {Extensions, ArmorPatcher, AlchemyPatcher} =  src(args);
	return {
		initialize: function() {
			console.log(settings.patchFileName);
			//Initialize locals references for things we need later
			locals.patchFile = patchFile;
			locals.patcherPath = patcherPath;
			locals.Skyrim_Master = xelib.FileByName(`Skyrim.esm`);
			locals.dragonborn_Master = xelib.FileByName(`Dragonborn.esm`);
			locals.PerkusMaximus_Master = xelib.FileByName(`PerkusMaximus_Master.esp`);
			settings.UseWarrior = UseWarrior;
			settings.UseThief = UseThief;
			settings.UseMage = UseMage;
			if (UseWarrior) {
				locals.PerkusMaximus_Warrior = xelib.FileByName(`PerkusMaximus_Warrior.esp`);
				locals.forgedKeyword = xelib.AddElement(patchFile, `KYWD\\KYWD`);
				xelib.AddElementValue(locals.forgedKeyword, `EDID`, 'ArmorPerMaForged');
			}
			if (UseThief) {
				locals.PerkusMaximus_Thief = xelib.FileByName(`PerkusMaximus_Thief.esp`);
			}
			if (UseMage) {
				locals.PerkusMaximus_Mage = xelib.FileByName(`PerkusMaximus_Mage.esp`);
			}
			Extensions.initJSONs();
			Extensions.initRefMaps();
			Extensions.initArmorPatcher();
		},
		process: [
			/*ArmorPatcher.loadAndPatch_Armors,
			ArmorPatcher.loadAndPatch_Clothes,
			ArmorPatcher.records_AllARMO,*/
			AlchemyPatcher.loadAndPatch_Ingestible,
			AlchemyPatcher.loadAndPatch_Ingredients,
			AlchemyPatcher.records_Alchemy,
			/*Extensions.records_reportITPOs(),*/
		]
	}
}

registerPatcher({
	info: info,
	gameModes: [xelib.gmSSE],
	settings: {
		label: 'Patchus Maximus Rebuilt',
		defaultSettings: {
			patchFileName: 'PatchusMaximus.esp',
			expensiveClothingThreshold: 50
		}
	},
	requiredFiles: [`PerkusMaximus_Master.esp`],
	execute: executePatchusMaximus
});