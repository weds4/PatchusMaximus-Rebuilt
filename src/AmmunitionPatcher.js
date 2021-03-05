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

  function setDamage(rec){}
  function patchProjectile(rec){}

function doAmmoVariants(Record, ammoMaterial, ammoType){
  if (stringToBoolean[ammoMaterial.multiply]) {
    if (!Record.isCopy){copyRecord(Record);}
    if (ammoType.type === `ARROW`) {
      createArrowVariant(Record.handle, "poison");
      //createArrowVariant(Record.handle, "fire");
      //createArrowVariant(Record.handle, "frost");
      //createArrowVariant(Record.handle, "shock");
      //createArrowVariant(Record.handle, "lightsource");
      //createArrowVariant(Record.handle, "explosive");
      //createArrowVariant(Record.handle, "timebomb");
    }
    else if (ammoType.type === `BOLT`) {
      createBoltVariant(Record.handle);
    }
  }
}

  function ammoNamingMimic(rec, type) {
    return `${xelib.GetValue(rec, `FULL`)}${type}${xelib.GetHexFormID(rec).slice(2,)}`+
    `${xelib.LongPath(xelib.GetMasterRecord(rec))
        .slice(0,xelib.LongPath(xelib.GetMasterRecord(rec)).indexOf(".")+4)}`
  }

  function createAmmoVariantRecipe(newAmmo, type) {

  }

  function createArrowVariant(rec, type) {
    //get the variant data for the type parameter from locals
    let {name, desc, EXPL, flagExplosion, flagAltTrigger} = locals.variantTypes[type]
    //make the variant ammo and set relevant data
    let ammoVariant = xelib.CopyElement(rec, patchFile, true);
    let newEDID = `PaMa_AMMO_${ammoNamingMimic(ammoVariant, name)}`;
    xelib.SetValue(ammoVariant, `EDID`, newEDID);
    let newName = `${xelib.GetValue(ammoVariant, `FULL`)} - ${name}`;
    xelib.SetValue(ammoVariant, `FULL`, newName);
    xelib.SetValue(ammoVariant, `DESC`, desc);
    //make a new projectile for the new ammo, projectile info changes with ammo type
    let newProjectile = xelib.CopyElement(xelib.GetLinksTo(ammoVariant, `DATA\\Projectile`), patchFile, true);
    newEDID = `PaMa_PROJ_${ammoNamingMimic(newProjectile, `-${name}`)}`;
    xelib.SetValue(newProjectile, `EDID`, newEDID);
    xelib.SetFlag(newProjectile, `DATA\\Flags`, `Explosion`, flagExplosion);
    xelib.SetFlag(newProjectile, `DATA\\Flags`, `Alt. Trigger`, flagAltTrigger);
    xelib.SetLinksTo(newProjectile, `DATA\\Explosion`, EXPL);
    //assign new projectile to new ammo
    xelib.SetLinksTo(ammoVariant, `DATA\\Projectile`, newProjectile);
    createAmmoVariantRecipe(ammoVariant, type);
  }

  function createBoltVariant(rec) {

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
      if (settings.UseWarrior){
        ammo.forEach(rec => {
          let Record = getRecordObject(rec);
          if (!Record.isCopy){copyRecord(Record);}
          setDamage(Record.handle);
          patchProjectile(Record.handle);
          doAmmoVariants(Record, ammoMaterialsReference[rec], ammoTypesReference[rec]);
        });
      }
      else {
        ammo.forEach(rec => {
          let Record = getRecordObject(rec);
          doAmmoVariants(Record, ammoMaterialsReference[rec]);
        });
      }
      helpers.logMessage(`Done patching ammuniton`);
      return [];
    }
  };
    
  return {
    records_Ammo,
  };
}