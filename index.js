let reqExtensions = require(`${patcherPath}/src/PaMaRemadeExtension.js`);
let reqArmorPatcher = require(`${patcherPath}/src/ArmorPatcher.js`);
let reqAlchemyPatcher = require(`${patcherPath}/src/AlchemyPatcher.js`);


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
  execute: (patchFile, helpers, settings, locals) => {
    const 
      Extensions = reqExtensions({xelib, fh, patcherPath, patchFile, settings, helpers, locals}),
      ArmorPatcher = reqArmorPatcher({xelib, Extensions, patchFile, settings, helpers, locals}),
      AlchemyPatcher = reqAlchemyPatcher({xelib, Extensions, patchFile, settings, helpers, locals});

    return {
      initialize: function() {
        console.log(settings.patchFileName);
        //Initialize locals references for things we need later
        locals.patchFile = patchFile
        locals.patcherPath = patcherPath
        locals.Skyrim_Master = xelib.FileByName(`Skyrim.esm`);
        locals.dragonborn_Master = xelib.FileByName(`Dragonborn.esm`);
        locals.PerkusMaximus_Master = xelib.FileByName(`PerkusMaximus_Master.esp`);
        settings.UseWarrior = UseWarrior;
        settings.UseThief = UseThief;
        settings.UseMage = UseMage;
        if (settings.UseWarrior) {
          locals.PerkusMaximus_Warrior = xelib.FileByName(`PerkusMaximus_Warrior.esp`)
          locals.forgedKeyword = xelib.AddElement(patchFile, `KYWD\\KYWD`);
          xelib.AddElementValue(locals.forgedKeyword, `EDID`, 'ArmorPerMaForged');
        };
        if (settings.UseThief) {locals.PerkusMaximus_Thief = xelib.FileByName(`PerkusMaximus_Thief.esp`)};
        if (settings.UseMage) {locals.PerkusMaximus_Mage = xelib.FileByName(`PerkusMaximus_Mage.esp`)};
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
        AlchemyPatcher.records_Alchemy(patchFile, settings, helpers, locals),
        //Extensions.records_reportITPOs(patchFile, settings, helpers, locals),
      ]
    }
  }
});