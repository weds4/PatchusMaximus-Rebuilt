let Extensions = require(`${patcherPath}/src/PaMaRemadeExtension.js`)
let ArmorPatcher = require(`${patcherPath}/src/ArmorPatcher.js`)
let AlchemyPatcher = require(`${patcherPath}/src/AlchemyPatcher.js`)

//User can choose these (need settings.html, I guess?)
let UseWarrior = true, UseThief = true, UseMage = true;

registerPatcher({
	info: info,
	gameModes: [xelib.gmSSE],
	settings: {
		label: 'Patchus Maximus Rebuilt',
		defaultSettings: {
      patchFileName: 'PatchusMaximus.esp'
    }
	},

	requiredFiles: [`PerkusMaximus_Master.esp`],

  execute: (patchFile, helpers, settings, locals) => ({
		initialize: function() {
      console.log(settings.patchFileName);
      //Initialize locals references for things we need later
      locals.patchFile = patchFile
      locals.patcherPath = patcherPath
      locals.Skyrim_Master = xelib.FileByName(`Skyrim.esm`);
      locals.dragonborn_Master = xelib.FileByName(`Dragonborn.esm`);
      locals.PerkusMaximus_Master = xelib.FileByName(`PerkusMaximus_Master.esp`);
      locals.UseWarrior = UseWarrior;
      locals.UseThief = UseThief;
      locals.UseMage = UseMage;
      if (UseWarrior) {
        locals.PerkusMaximus_Warrior = xelib.FileByName(`PerkusMaximus_Warrior.esp`)
        locals.forgedKeyword = xelib.AddElement(patchFile, `KYWD\\KYWD`);
        xelib.AddElementValue(locals.forgedKeyword, `EDID`, 'ArmorPerMaForged');
      };
      if (UseThief) {locals.PerkusMaximus_Thief = xelib.FileByName(`PerkusMaximus_Thief.esp`)};
      if (UseMage) {locals.PerkusMaximus_Mage = xelib.FileByName(`PerkusMaximus_Mage.esp`)};
      Extensions.initJSONs(fh, locals, patcherPath);
      Extensions.initRefMaps(locals);
      Extensions.initArmorPatcher(locals);
    },

    process: [
      ArmorPatcher.loadAndPatch_Armors(patchFile, settings, helpers, locals),
      ArmorPatcher.loadAndPatch_Clothes(patchFile, settings, helpers, locals),
      ArmorPatcher.records_AllARMO(patchFile, settings, helpers, locals),
      AlchemyPatcher.loadAndPatch_Ingestible(patchFile, settings, helpers, locals),
      AlchemyPatcher.loadAndPatch_Ingredients(patchFile, settings, helpers, locals),
    ]
	})
});