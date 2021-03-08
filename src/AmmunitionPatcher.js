module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants; //can use this instead of Extensions.constants.equalTo
  const {getRecordObject, copyRecord} = Extensions.RecordObjectFunctions; //can use this instead of Extensions.RecordObjectFunctions.getRecordObject

  //-----------------Ammo Patcher Dictionary/Lexicon Objects------------------------
  const enhancedAmmoData = {//needs to be set in settings
    timebombTimer: 4.0,
    enhancementIn: 20,
    enhancementOut: 10,
    enhancementOutSE0Mult: 1.2,
    enhancementOutSE1Mult: 1.4
  };
  //-----------------Ammo Patcher Supporting Functions----------------------------------
  function addRecordAmmoType(rec, referenceObject){
    referenceObject[rec] = Extensions.getObjectFromBinding(rec, locals.ammoTypeBindings, locals.ammoTypes);
  }

  function addRecordAmmoMaterial(rec, referenceObject){
    referenceObject[rec] = Extensions.getObjectFromBinding(rec, locals.ammoMaterialBindings, locals.ammoMaterials);
  }

  function setDamage(rec){xelib.SetValue(rec, `DESC`, `changed damage`);}
  function patchProjectile(rec){}

  function ammoNamingMimic(rec, type) {
    return `${xelib.GetValue(rec, `FULL`)}${type}${xelib.GetHexFormID(rec).slice(2,)}`+
    `${xelib.LongPath(xelib.GetMasterRecord(rec))
        .slice(0,xelib.LongPath(xelib.GetMasterRecord(rec)).indexOf(".")+4)}`
  }

  function createAmmoCraftingRecipe(baseAmmo, newAmmo, input, output, requiredPerks, blockerPerk) {
    let edid = `PaMa_AMMO_CRAFT_${xelib.GetValue(newAmmo, `FULL`)}${Extensions.getFormStr(baseAmmo)}${(blockerPerk)? `${Extensions.getFormStr(blockerPerk)}`: ''}`;
    console.log(edid);
    let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe, `EDID`, edid);
    let newItem = Extensions.addLinkedArrayItem(newRecipe, `Items`, baseAmmo, `CNTO\\Item`);
    xelib.SetValue(newItem, `CNTO\\Count`, input.toString());
    if (blockerPerk) {Extensions.addLinkedCondition(newRecipe, `HasPerk`, `0`, equalTo, blockerPerk);}
    requiredPerks.forEach(perk => {
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, perk);
    });
    Extensions.addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, baseAmmo)
    Extensions.addLinkedElementValue(newRecipe, 'CNAM', newAmmo); //Created Object
    Extensions.addLinkedElementValue(newRecipe, 'BNAM', locals.skyrimKeywords.CraftingSmithingForge); //Workbench Keyword
    xelib.AddElementValue(newRecipe, `NAM1`, output.toString()); //Created Object Count
  }

  function createAmmoVariantRecipes(baseAmmo, newAmmo, type) {
    let {enhancementIn, enhancementOut, enhancementOutSE0Mult, enhancementOutSE1Mult} = enhancedAmmoData;
    let requiredPerks = [locals.variantTypes[type].perk];
    let tierOnePerk = locals.permaPerks.xMAALCSkilledEnhancer0;
    let tierTwoPerk = locals.permaPerks.xMAALCSkilledEnhancer1;
    let enhancementOutSE0 = enhancementOut*enhancementOutSE0Mult;
    let enhancementOutSE1 = enhancementOut*enhancementOutSE1Mult;
    createAmmoCraftingRecipe(baseAmmo, newAmmo, enhancementIn, enhancementOut, requiredPerks, tierOnePerk);
    requiredPerks.push(tierOnePerk);
    createAmmoCraftingRecipe(baseAmmo, newAmmo, enhancementIn, enhancementOutSE0, requiredPerks, tierTwoPerk);
    requiredPerks.push(tierTwoPerk);
    createAmmoCraftingRecipe(baseAmmo, newAmmo, enhancementIn, enhancementOutSE1, requiredPerks, null);
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
    createAmmoVariantRecipes(rec, ammoVariant, type);
  }

  function createBoltVariant(rec) {

  }

  function doAmmoVariants(rec, ammoMaterial, ammoType){
    if (stringToBoolean[ammoMaterial.multiply]) {
      if (ammoType.type === `ARROW`) {
        createArrowVariant(rec, "poison");
        //createArrowVariant(rec, "fire");
        //createArrowVariant(rec, "frost");
        //createArrowVariant(rec, "shock");
        //createArrowVariant(rec, "lightsource");
        //createArrowVariant(rec, "explosive");
        //createArrowVariant(rec, "timebomb");
      }
      else if (ammoType.type === `BOLT`) {
        createBoltVariant(rec);
      }
    }
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
          doAmmoVariants(Record.handle, ammoMaterialsReference[rec], ammoTypesReference[rec]);
        });
      }
      else {
        ammo.forEach(rec => {
          let Record = getRecordObject(rec);
          doAmmoVariants(Record.handle, ammoMaterialsReference[rec], ammoTypesReference[rec]);
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