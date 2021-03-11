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

  function multiplicationAllowed(rec){//using this info apparently improves patcher performance even though the original didn't use it
    let multiplicationRules = locals.ammunitionJson[`ns2:ammunition`].ammunition_exclusions_multiplication.exclusion;
    return multiplicationRules.every(rule => {
      let target = xelib[exclusionMap[rule.target]](rec);
      let method = exclusionMap[rule.type];
      if(method === 'EQUALS') return target !== rule.text;
      return !target[method](rule.text);
    });
  }

  function setDamage(Record, ammoType, ammoMaterial){
    let oldDamage = parseFloat(xelib.GetValue(Record.handle, `DATA\\Damage`));
    let newDamage = parseFloat(ammoType.damageBase) + parseFloat(ammoMaterial.damageModifier);
    if (oldDamage !== newDamage){
      if (!Record.isCopy){copyRecord(Record);}
      xelib.SetValue(Record.handle, `DATA\\Damage`, newDamage.toString());
    }
  }

  function patchProjectile(rec, ammoType, ammoMaterial){
    let projectile = xelib.GetWinningOverride(xelib.GetLinksTo(rec, `DATA\\Projectile`));
    if (projectile !== 0){//if projectile exists
      let Record = getRecordObject(projectile);
      console.log(`projectile is ` + xelib.Name(Record.handle));
      let oldSpeed = parseFloat(xelib.GetValue(Record.handle, `DATA\\Speed`));
      let newSpeed = parseFloat(ammoType.speedBase) + parseFloat(ammoMaterial.speedModifier);
      if (oldSpeed !== newSpeed){
        if (!Record.isCopy){copyRecord(Record);}
        xelib.SetValue(Record.handle, `DATA\\Speed`, newSpeed.toString());
      }
      let oldGravity = parseFloat(xelib.GetValue(Record.handle, `DATA\\Gravity`));
      let newGravity = parseFloat(ammoType.gravityBase) + parseFloat(ammoMaterial.gravityModifier);
      if (oldGravity !== newGravity){
        if (!Record.isCopy){copyRecord(Record);}
        xelib.SetValue(Record.handle, `DATA\\Gravity`, newGravity.toString());
      }
      let oldRange = parseFloat(xelib.GetValue(Record.handle, `DATA\\Range`));
      let newRange = parseFloat(ammoType.rangeBase) + parseFloat(ammoMaterial.rangeModifier);
      if (oldRange !== newRange){
        if (!Record.isCopy){copyRecord(Record);}
        xelib.SetValue(Record.handle, `DATA\\Range`, newRange.toString());
      }
    }
  }

  function ammoNamingMimic(rec, type) {
    return `${xelib.GetValue(rec, `FULL`)}${type}${xelib.GetHexFormID(rec).slice(2,)}`+
    `${xelib.LongPath(xelib.GetMasterRecord(rec))
        .slice(0,xelib.LongPath(xelib.GetMasterRecord(rec)).indexOf(".")+4)}`
  }

  function createAmmoCraftingRecipe(args) {
    let {baseAmmo, newAmmo, input, ingredients, output, requiredPerks, blockerPerk} = args
    let edid = `PaMa_AMMO_CRAFT_${xelib.GetValue(newAmmo, `FULL`).toPascalCase()}${Extensions.getFormStr(baseAmmo)}${(blockerPerk)? `${Extensions.getFormStr(blockerPerk)}`: ''}`;
    let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe, `EDID`, edid);
    let newItem = Extensions.addLinkedArrayItem(newRecipe, `Items`, baseAmmo, `CNTO\\Item`);
    xelib.SetValue(newItem, `CNTO\\Count`, input.toString());
    ingredients.forEach(ingr => {
      let newItem = Extensions.addLinkedArrayItem(newRecipe, `Items`, ingr, `CNTO\\Item`);
      xelib.SetValue(newItem, `CNTO\\Count`, `1`);
    });
    Extensions.addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, baseAmmo);
    requiredPerks.forEach(perk => {
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, perk);
    });
    if (blockerPerk) {Extensions.addLinkedCondition(newRecipe, `HasPerk`, `0`, equalTo, blockerPerk);}
    Extensions.addLinkedElementValue(newRecipe, 'CNAM', newAmmo); //Created Object
    Extensions.addLinkedElementValue(newRecipe, 'BNAM', locals.skyrimKeywords.CraftingSmithingForge); //Workbench Keyword
    xelib.AddElementValue(newRecipe, `NAM1`, output.toString()); //Created Object Count
  }

  function createAmmoVariantRecipes(baseAmmo, newAmmo, type) {
    let {enhancementIn, enhancementOut, enhancementOutSE0Mult, enhancementOutSE1Mult} = enhancedAmmoData;
    let enhancementOutSE0 = enhancementOut*enhancementOutSE0Mult;//should be able to move out once enhancement counts are moved to settings
    let enhancementOutSE1 = enhancementOut*enhancementOutSE1Mult;//should be able to move out once enhancement counts are moved to settings
    let tierOnePerk = locals.permaPerks.xMAALCSkilledEnhancer0;
    let tierTwoPerk = locals.permaPerks.xMAALCSkilledEnhancer1;
    let args = {
      baseAmmo: baseAmmo,
      newAmmo: newAmmo,
      input: enhancementIn,
      ingredients: locals.variantTypes[type].ingredients,
      output: enhancementOut,
      requiredPerks: [locals.variantTypes[type].perk],
      blockerPerk: tierOnePerk
    };
    createAmmoCraftingRecipe(args);
    args.output = enhancementOutSE0;
    args.requiredPerks.push(tierOnePerk);
    args.blockerPerk = tierTwoPerk;
    createAmmoCraftingRecipe(args);
    args.output = enhancementOutSE1;
    args.requiredPerks.push(tierTwoPerk);
    args.blockerPerk = null;
    createAmmoCraftingRecipe(args);
  }

  function createAmmoVariant(rec, type) {
    //get the variant data for the type parameter from locals
    let {name, desc, flagExplosion, flagAltTrigger, EXPL} = locals.variantTypes[type]
    //make the variant ammo and set relevant data
    let ammoVariant = xelib.CopyElement(rec, patchFile, true);
    let newEDID = `PaMa_AMMO_${ammoNamingMimic(ammoVariant, name)}`;
    xelib.SetValue(ammoVariant, `EDID`, newEDID);
    let newName = `${xelib.GetValue(ammoVariant, `FULL`)} - ${name}`;
    xelib.SetValue(ammoVariant, `FULL`, newName);
    xelib.SetValue(ammoVariant, `DESC`, desc);
    //make a new projectile for the new ammo, projectile info changes with ammo type
    let oldProjectile = xelib.GetLinksTo(ammoVariant, `DATA\\Projectile`);
    if (oldProjectile !== 0) {//if oldProjectile exists
      let newProjectile = xelib.CopyElement(oldProjectile, patchFile, true);
      newEDID = `PaMa_PROJ_${ammoNamingMimic(newProjectile, `-${name}`)}`;
      xelib.SetValue(newProjectile, `EDID`, newEDID);
      xelib.SetFlag(newProjectile, `DATA\\Flags`, `Explosion`, flagExplosion);
      xelib.SetFlag(newProjectile, `DATA\\Flags`, `Alt. Trigger`, flagAltTrigger);
      if (EXPL) {xelib.SetLinksTo(newProjectile, `DATA\\Explosion`, EXPL);}
      //assign new projectile to new ammo
      xelib.SetLinksTo(ammoVariant, `DATA\\Projectile`, newProjectile);
    }    
    createAmmoVariantRecipes(rec, ammoVariant, type);
    return ammoVariant;
  }

  function doAmmoVariants(rec, ammoType){//read-only functions
    if (ammoType === `ARROW`) {
      createAmmoVariant(rec, "poison");
      createAmmoVariant(rec, "fire");
      createAmmoVariant(rec, "frost");
      createAmmoVariant(rec, "shock");
      createAmmoVariant(rec, "lightsource");
      createAmmoVariant(rec, "explosive");
      createAmmoVariant(rec, "timebomb");
    }
    else if (ammoType === `BOLT`) {
      let strongAmmo = createAmmoVariant(rec, "strong");
      let strongestAmmo = createAmmoVariant(rec, "strongest");
      createAmmoVariant(rec, "poison");
      createAmmoVariant(strongAmmo, "poison");
      createAmmoVariant(strongestAmmo, "poison");
      createAmmoVariant(rec, "shock");
      createAmmoVariant(strongAmmo, "shock");
      createAmmoVariant(strongestAmmo, "shock");
      createAmmoVariant(rec, "frost");
      createAmmoVariant(strongAmmo, "frost");
      createAmmoVariant(strongestAmmo, "frost");
      createAmmoVariant(rec, "fire");
      createAmmoVariant(strongAmmo, "fire");
      createAmmoVariant(strongestAmmo, "fire");
      createAmmoVariant(rec, "barbed");
      createAmmoVariant(strongAmmo, "barbed");
      createAmmoVariant(strongestAmmo, "barbed");
      createAmmoVariant(rec, "explosive");
      createAmmoVariant(strongAmmo, "explosive");
      createAmmoVariant(strongestAmmo, "explosive");
      createAmmoVariant(rec, "timebomb");
      createAmmoVariant(strongAmmo, "timebomb");
      createAmmoVariant(strongestAmmo, "timebomb");
      createAmmoVariant(rec, "lightsource");
      createAmmoVariant(strongAmmo, "lightsource");
      createAmmoVariant(strongestAmmo, "lightsource");
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
        addRecordAmmoType(rec, ammoTypesReference);
        addRecordAmmoMaterial(rec, ammoMaterialsReference);
        return xelib.HasElement(rec, `FULL`) 
        && (xelib.GetValue(rec, `FULL`) !== ``)
        && !xelib.GetFlag(rec,`DATA\\Flags`, `Non-Playable`)
        && (ammoTypesReference[rec] !== null)
        && (ammoMaterialsReference[rec] !== null);
      });
      helpers.logMessage(`Patching ammuniton`);
      if (settings.UseWarrior){
        ammo.forEach(rec => {
          let Record = getRecordObject(rec);
          setDamage(Record, ammoTypesReference[rec], ammoMaterialsReference[rec]);
          patchProjectile(Record.handle, ammoTypesReference[rec], ammoMaterialsReference[rec]);
          if (stringToBoolean[ammoMaterialsReference[rec].multiply] && multiplicationAllowed(Record.handle)){
            doAmmoVariants(Record.handle, ammoTypesReference[rec].type);
          }
        });
      }
      else {
        ammo.forEach(rec => {//Record uneeded since this entire block is read-only
          if (stringToBoolean[ammoMaterialsReference[rec].multiply] && multiplicationAllowed(rec)){
            doAmmoVariants(rec, ammoTypesReference[rec].type);
          }
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