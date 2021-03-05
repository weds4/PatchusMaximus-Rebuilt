module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants; //can use this instead of Extensions.constants.equalTo
  const {getRecordObject, copyRecord} = Extensions.RecordObjectFunctions; //can use this instead of Extensions.RecordObjectFunctions.getRecordObject

  //-----------------Ammo Patcher Dictionary/Lexicon Objects------------------------
  //-----------------Ammo Patcher Supporting Functions----------------------------------
  function addRecordAmmoType(rec, referenceObject){
    referenceObject[rec] = Extensions.getObjectFromBinding(rec, locals.ammoTypeBindings, locals.ammoTypes);
  }

  function addRecordAmmoMaterial(rec, referenceObject){
    referenceObject[rec] = Extensions.getObjectFromBinding(rec, locals.ammoMaterialBindings, locals.ammoMaterials);
  }

  //-----------------Ammo Patcher Objects----------------------------------
  /*Every object feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/

  const records_Ammo = {
    records: (filesToPatch, helpers, settings, locals) => {
      helpers.logMessage(`Loading ammunition`);
      let ammoTypesReference = {};
      let ammoMaterialsReference = {};
      let ammo = helpers.loadRecords('AMMO')
      .filter(rec => {//Called for each loaded record. Return false to skip patching a record
        let keywords = Extensions.GetRecordKeywordEDIDs(rec);
        addRecordAmmoType(rec, ammoTypesReference);
        addRecordAmmoMaterial(rec, ammoMaterialsReference);
        return xelib.HasElement(rec, `FULL`) 
        && (xelib.GetValue(rec, `FULL`) !== ``)
        && !xelib.GetRecordFlag(rec,`Non-Playable`)
        && (ammoTypesReference[rec] !== null)
        && (ammoMaterialsReference[rec] !== null);
      });
      helpers.logMessage(`Patching ammuniton`);
      ammo.forEach(rec => {
        if (stringToBoolean[ammoMaterialsReference[rec].multiply]) {}
        if (settings.UseWarrior) {}
      });
      helpers.logMessage(`Done patching ammuniton`);
      return [];
    }
  };
    
  return {
    records_Ammo,
  };
}