module.exports = function({xelib, Extensions, constants, patchFile, settings, helpers, locals}){
  //Useful constants
  let equalTo = `10000000`;
  let greaterThanEqualTo = `11000000`;
  //configurable value (need to make settings for it)
  let expensiveClothingThreshold = 50;

  //-----------------Armor Patcher Dictionary/Lexicon Objects------------------------
  let ClothingKeywords = {
    'ClothingBody': true,
    'ClothingHands': true,
    'ClothingFeet': true,
    'ClothingHead': true,
    'VendorItemClothing': true,
    'ArmorClothing': true,
    'ClothingPoor': true,
    'ClothingRich': true
  };

  let JewelryKeywords = {
    'VendorItemJewelry': true,
    'JewelryExpensive': true,
    'ClothingRing': true,
    'ClothingNecklace': true,
    'ClothingCirclet': true
  };

  let armorSlotKeywords = {
    'ArmorCuirass': true,
    'ArmorGauntlets': true,
    'ArmorBoots': true,
    'ArmorHelmet': true,
    'ArmorShield': true
  };

  let armorSlotMultiplier = {
    'ArmorCuirass': "armorFactorBody",
    'ArmorGauntlets': "armorFactorHands",
    'ArmorBoots': "armorFactorFeet",
    'ArmorHelmet': "armorFactorHead",
    'ArmorShield': "armorFactorShield"
  };

  let exclusionMap = {
    NAME: 'Name',
    EDID: 'EditorID',
    CONTAINS: 'contains',
    STARTSWITH: 'startsWith',
    EQUALS: 'EQUALS'
  };

  let armorMeltdownOutput = {
    'ArmorCuirass': "meltdownOutputBody",
    'ArmorGauntlets': "meltdownOutputHands",
    'ArmorBoots': "meltdownOutputFeet",
    'ArmorHelmet': "meltdownOutputHead",
    'ArmorShield': "meltdownOutputShield"
  };

  //-----------------Armor Patcher Supporting Functions----------------------------------
  function getArmorMaterial(rec){
    return Extensions.getObjectFromBinding(rec, locals.armorBindings, locals.armorMaterial);
  }

  function doArmorKeywords(rec, armorMaterial){
    /*determine if this armor material is light or heavy, 
    and assign the appropriate keywords */
    let keywords = Extensions.GetRecordKeywordEDIDs(rec);
    let thisArmorType = locals.armorTypes[armorMaterial.type]
    if (keywords.includes(xelib.EditorID(locals.removeKeywords[armorMaterial.type]))){
      xelib.RemoveKeyword(rec, xelib.GetHexFormID(locals.removeKeywords[armorMaterial.type]));
    }
    if (thisArmorType){
      if (!keywords.includes(xelib.EditorID(thisArmorType.keyword))){
        //if it doesnt have the keyword, add it
        Extensions.addLinkedArrayItem(rec, 'KWDA', thisArmorType.keyword);
      }
      if (xelib.HasElement(rec, `[BOD2|BODT]\\Armor Type`)) {
        if(!(xelib.GetValue(rec,`[BOD2|BODT]\\Armor Type`) === thisArmorType.ArmorType)){
          xelib.SetValue(rec,`[BOD2|BODT]\\Armor Type`, thisArmorType.ArmorType)
        }
      }
      keywords.forEach(kw => {
        if (armorSlotKeywords[kw]) {Extensions.addLinkedArrayItem(rec, `KWDA`, thisArmorType[kw]);}
      }); 
    }
  }

  function setArmorValue(rec, armorMaterial){
    let originalAR = xelib.GetValue(rec, `DNAM`);
    let armorSlotMult = 0;
    Extensions.GetRecordKeywordEDIDs(rec).some(kw => {
      let test = armorSlotMultiplier[kw]
      if (test) {
        armorSlotMult = locals.armorJson["ns2:armor"].armor_settings[test]
        return true
      }
    });
    let newAR = armorMaterial.armorBase * armorSlotMult;
    if (newAR > originalAR && newAR > 0) {
      xelib.SetValue(rec, `DNAM`, newAR.toString());
    }
  }

  function getArmorModifier(rec){
    return Extensions.getObjectFromBinding(rec, locals.armorModBindings, locals.armorModifer);
  }

  function applyArmorModfiers(rec){
    let armorMod = getArmorModifier(rec);
    if (armorMod != null){
      let current = xelib.GetValue(rec, `DATA\\Weight`);
      xelib.SetValue(rec, `DATA\\Weight`, (current*armorMod.factorWeight).toString());
      current = xelib.GetValue(rec, `DATA\\Value`);
      xelib.SetValue(rec, `DATA\\Value`, Math.round(current*armorMod.factorValue).toString());
      current = xelib.GetValue(rec, `DNAM`);
      xelib.SetValue(rec, `DNAM`, (current*armorMod.factorArmor).toString());
    }
  }

  function addMasqueradeKeywords(rec){
    let armorName = xelib.GetValue(rec,`FULL`);
    let armorMasqueradeBindingObject = locals.armorJson[`ns2:armor`].armor_masquerade_bindings.armor_masquerade_binding;
    let keywordList = [];
    armorMasqueradeBindingObject.forEach(binding =>  {
      if (armorName.includes(binding.substringArmor)) {
          keywordList.push(binding.masqueradeFaction);
      }
    });
    if (keywordList) {
      keywordList.forEach(kw => {
        if (kw) {Extensions.addLinkedArrayItem(rec, `KWDA`, locals.masqueradeFactions[kw])};
      });
    }
  }

  function ReforgeAllowed(rec){
    if (xelib.GetRecordFlag(rec,`Non-Playable`)) {return false}
    else {
      let reforgeRules = locals.armorJson[`ns2:armor`].reforge_exclusions.exclusion;
      return reforgeRules.every(rule => {
        let target = xelib[exclusionMap[rule.target]](rec);
        let method = exclusionMap[rule.type];
        if(method === 'EQUALS') return target !== rule.text;
        return !target[method](rule.text);
      });
    }
  }

  function getArmorMeltdownOutput(rec) {
    let count = 0
    Extensions.GetRecordKeywordEDIDs(rec).some(kw => {
      let test = armorMeltdownOutput[kw];
      if (test) {
        count = locals.armorJson["ns2:armor"].armor_settings[test]
        return true
      }
    });
    return count.toString();//I don't like giving 0 material (this case *is* used occasionally)
  }

  function addClothingMeltdownRecipe(rec) {
    let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe,`EDID`,`PaMa_CLOTH_MELTDOWN_`+Extensions.namingMimic(rec));
    let newItem = Extensions.addLinkedArrayItem(newRecipe, `Items`, rec, `CNTO\\Item`);
    xelib.SetValue(newItem, `CNTO\\Count`, '1');
    Extensions.addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, rec);
    Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, locals.permaPerks.xMASMIMeltdown);
    Extensions.addLinkedElementValue(newRecipe, 'CNAM', locals.skyrimMisc.LeatherStrips); //Created Object
    Extensions.addLinkedElementValue(newRecipe, 'BNAM', locals.skyrimKeywords.CraftingTanningRack); //Workbench Keyword
    xelib.AddElementValue(newRecipe, `NAM1`, getArmorMeltdownOutput(rec)); //Created Object Count
  }

  function addArmorMeltdownRecipe(rec, armorMaterial){
    let materialMeltdown = armorMaterial.materialMeltdown;
    if (materialMeltdown !== "NONE"){
      let requiredPerk = locals.BaseMaterialsArmor[materialMeltdown].perk;
      let output = locals.BaseMaterialsArmor[materialMeltdown].meltdownIngot;
      let benchKW = locals.BaseMaterialsArmor[materialMeltdown].meltdownCraftingStation;
      let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
      xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_MELTDOWN_${Extensions.namingMimic(rec)}`);
      let newItem = Extensions.addLinkedArrayItem(newRecipe, `Items`, rec, `CNTO\\Item`);
      xelib.SetValue(newItem, `CNTO\\Count`, '1');
      Extensions.addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, rec);
      if (requiredPerk) {Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)}
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, locals.permaPerks.xMASMIMeltdown);
      Extensions.addLinkedElementValue(newRecipe, 'CNAM', output); //Created Object
      Extensions.addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
      xelib.AddElementValue(newRecipe, `NAM1`, getArmorMeltdownOutput(rec)); //Created Object Count
    }
  }

  function addTemperingRecipe(rec, armorMaterial){
    let materialTemper = armorMaterial.materialTemper;
    if (materialTemper !== `NONE`){
      let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
      let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot;
      let benchKW = locals.skyrimKeywords.CraftingSmithingArmorTable;
      let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
      xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_TEMPER_${Extensions.namingMimic(rec)}`);
      let newItem = Extensions.addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
      xelib.SetValue(newItem, `CNTO\\Count`, '1');
      if (requiredPerk) {Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)}
      Extensions.addLinkedElementValue(newRecipe, 'CNAM', rec); //Created Object
      Extensions.addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
      xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
    }
  }

  function addReforgedArmorRecipe(reforgedArmor, oldArmor, armorMaterial){
    let materialTemper = armorMaterial.materialTemper;
    if (materialTemper !== `NONE`){
      let reforgePerk = locals.permaPerks.xMASMIArmorer;
      let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
      let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot;
      let benchKW = locals.skyrimKeywords.CraftingSmithingForge;
      let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
      xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_CRAFT_${Extensions.namingMimic(reforgedArmor)}`);
      let newItem1 = Extensions.addLinkedArrayItem(newRecipe, `Items`, oldArmor, `CNTO\\Item`);
      xelib.SetValue(newItem1, `CNTO\\Count`, '1');
      let newItem2 = Extensions.addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
      xelib.SetValue(newItem2, `CNTO\\Count`, '2');
      if (requiredPerk) {Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)}
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, reforgePerk)
      Extensions.addLinkedElementValue(newRecipe, 'CNAM', reforgedArmor); //Created Object
      Extensions.addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
      xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count 
    }
  }

  function createReforgedArmor(rec, armorMaterial){
    reforgedArmor = xelib.CopyElement(rec, patchFile, true);
    oldName = xelib.GetValue(reforgedArmor, `FULL`);
    xelib.SetValue(reforgedArmor, `FULL`, `Reforged ${oldName}`);
    xelib.SetValue(reforgedArmor, `EDID`, `PaMa_ARMO_Reforged_${Extensions.namingMimic(rec)}`);
    Extensions.addLinkedArrayItem(reforgedArmor, `KWDA`, locals.forgedKeyword);
    applyArmorModfiers(reforgedArmor);
    addReforgedArmorRecipe(reforgedArmor, rec, armorMaterial);
    addArmorMeltdownRecipe(reforgedArmor, armorMaterial);
    addTemperingRecipe(reforgedArmor, armorMaterial);
    return reforgedArmor;
  }

  function addWarforgedArmorRecipe(warforgedArmor, reforgedArmor, armorMaterial){
    let materialTemper = armorMaterial.materialTemper;
    if (materialTemper !== `NONE`){
      let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
      let warforgePerk = locals.permaPerks.xMASMIMasteryWarforged;
      let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot;
      let benchKW = locals.skyrimKeywords.CraftingSmithingForge;
      let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
      xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_CRAFT_${Extensions.namingMimic(warforgedArmor)}`);
      let newItem1 = Extensions.addLinkedArrayItem(newRecipe, `Items`, reforgedArmor, `CNTO\\Item`);
      xelib.SetValue(newItem1, `CNTO\\Count`, '1');
      let newItem2 = Extensions.addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
      xelib.SetValue(newItem2, `CNTO\\Count`, '5');
      if (requiredPerk) {Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)}
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, warforgePerk)
      Extensions.addLinkedElementValue(newRecipe, 'CNAM', warforgedArmor); //Created Object
      Extensions.addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
      xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
    }
  }

  function createWarforgedArmor(rec, reforgedArmor, armorMaterial){
    //rec is the original armor
    warforgedArmor = xelib.CopyElement(rec, patchFile, true);
    oldName = xelib.GetValue(warforgedArmor, `FULL`);
    xelib.SetValue(warforgedArmor, `FULL`, `Warforged ${oldName}`);
    xelib.SetValue(warforgedArmor, `EDID`, `PaMa_ARMO_Warforged_${Extensions.namingMimic(rec)}`);
    Extensions.addLinkedArrayItem(warforgedArmor, `KWDA`, locals.forgedKeyword);
    applyArmorModfiers(warforgedArmor);
    addWarforgedArmorRecipe(warforgedArmor, reforgedArmor, armorMaterial);
    addArmorMeltdownRecipe(warforgedArmor, armorMaterial);
    addTemperingRecipe(warforgedArmor, armorMaterial);
  }

  function addReplicaArmorRecipe(rec, armorMaterial, original) {
    let materialTemper = armorMaterial.materialTemper;
    if (materialTemper !== `NONE`){
      let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
      let copycatPerk = locals.permaPerks.xMASMIMasteryWarforged;
      let artifactEssence = locals.permaMisc.xMASMICopycatArtifactEssence;
      let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot
      let benchKW = locals.skyrimKeywords.CraftingSmithingForge;
      let newRecipe = xelib.AddElement(patchFile,`Constructible Object\\COBJ`);
      xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_CRAFT_${Extensions.namingMimic(rec)}`);
      let newItem1 = Extensions.addLinkedArrayItem(newRecipe, `Items`, artifactEssence, `CNTO\\Item`);
      xelib.SetValue(newItem1, `CNTO\\Count`, '1');
      let newItem2 = Extensions.addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
      xelib.SetValue(newItem2, `CNTO\\Count`, '3');
      if (requiredPerk) {Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)}
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, copycatPerk);
      Extensions.addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, original);
      Extensions.addLinkedElementValue(newRecipe, 'CNAM', rec); //Created Object
      Extensions.addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
      xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
    }
  }

  function doDaedricReplicas(rec, armorMaterial){
    replicaArmor = xelib.CopyElement(rec, patchFile, true);
    oldName = xelib.GetValue(replicaArmor, `FULL`);
    xelib.SetValue(replicaArmor, `FULL`, `${oldName} Replica`);
    xelib.SetValue(replicaArmor, `EDID`, `PaMa_ARMO_${Extensions.namingMimic(replicaArmor)}`);
    applyArmorModfiers(replicaArmor);
    xelib.RemoveElement(replicaArmor, `EITM`);
    xelib.RemoveElement(replicaArmor, `VMAD`);
    addReplicaArmorRecipe(replicaArmor, armorMaterial, rec);
    addArmorMeltdownRecipe(replicaArmor, armorMaterial);
    let reforgedArmor = createReforgedArmor(replicaArmor, armorMaterial);
    createWarforgedArmor(replicaArmor, reforgedArmor, armorMaterial);
  }

  function getLeatherArmorCOBJ(rec, leatherArmorCOBJ) {
    let leathers = locals.likelyLeatherRecipes.filter(recipe => 
      xelib.EditorID(xelib.GetLinksTo(recipe, `CNAM`)) == xelib.EditorID(rec) 
    );
    let leatherCraft = leathers.filter(recipe => 
      xelib.EditorID(xelib.GetLinksTo(recipe, `BNAM`)) === `CraftingSmithingForge`
    );
    let leatherTemper = leathers.filter(recipe => 
      xelib.EditorID(xelib.GetLinksTo(recipe, `BNAM`)) === `CraftingSmithingArmorTable`
    );
    if (leatherCraft.length > 0){
      leatherCraft.forEach(rec => {
        leatherArmorCOBJ.craft.push(rec);
      });
      if (leatherTemper.length > 0){
        leatherTemper.forEach(rec => {
          leatherArmorCOBJ.temper.push(rec);
        });
      }
      return true;
    }
  }

  function ingredientsContainX(recipe, checkFor){
    let ingredients = xelib.GetElements(recipe, `Items`);
    return ingredients.some(rec => {
      if (xelib.EditorID(xelib.GetLinksTo(rec, 'CNTO\\Item')) === xelib.EditorID(checkFor)){
        return true;
      }
    });
  }

  function addQualityLeatherRecipe(rec, qualityLeatherArmor, leatherArmorCOBJ){
    let leatherPerk = locals.permaPerks.xMASMIMaterialLeather;
    let qualityLeather = locals.permaMisc.xMAWAYQualityLeather;
    let qualityLeatherStrips = locals.permaMisc.xMAWAYQualityLeatherStrips;
    let craftingRecipes = leatherArmorCOBJ.craft
    .filter(recipe =>
      xelib.EditorID(xelib.GetLinksTo(recipe, `CNAM`)) == xelib.EditorID(rec)
    );
    craftingRecipes.forEach(recipe => {
      let newRecipe = xelib.CopyElement(recipe, patchFile, true);
      xelib.SetValue(newRecipe, `EDID`, `PaMa_ARMO_CRAFT_${Extensions.namingMimic(qualityLeatherArmor)}`);
      xelib.RemoveElement(newRecipe, `Conditions`);
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, leatherPerk);
      if (xelib.HasElement(recipe, `Items`) && ingredientsContainX(newRecipe, locals.skyrimMisc.Leather01)) {
        Extensions.addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, qualityLeather);
        xelib.GetElements(newRecipe, `Items`).forEach(rec => {
          if (xelib.EditorID(xelib.GetLinksTo(rec, 'CNTO\\Item')) === `Leather01`){
            xelib.SetLinksTo(rec, 'CNTO\\Item', qualityLeather);
          }
        });
      }
      if (xelib.HasElement(recipe, `Items`) && ingredientsContainX(newRecipe, locals.skyrimMisc.LeatherStrips)) {
        Extensions.addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, qualityLeatherStrips);
        xelib.GetElements(newRecipe, `Items`).forEach(rec => {
          if (xelib.EditorID(xelib.GetLinksTo(rec, 'CNTO\\Item')) === `LeatherStrips`){
            xelib.SetLinksTo(rec, 'CNTO\\Item', qualityLeatherStrips);
          }
        });
      }
    });
  }

  function doQualityLeather(rec, armorMaterial, leatherArmorCOBJ){
    qualityLeatherArmor = xelib.CopyElement(rec, patchFile, true);
    oldName = xelib.GetValue(qualityLeatherArmor, `FULL`);
    xelib.SetValue(qualityLeatherArmor, `FULL`, `Quality ${oldName}`);
    xelib.SetValue(qualityLeatherArmor, `EDID`, `PaMa_ARMO_${Extensions.namingMimic(qualityLeatherArmor)}`);
    applyArmorModfiers(qualityLeatherArmor);
    addQualityLeatherRecipe(rec, qualityLeatherArmor, leatherArmorCOBJ);
    addArmorMeltdownRecipe(qualityLeatherArmor, armorMaterial);
    addTemperingRecipe(qualityLeatherArmor, armorMaterial);
    let reforgedArmor = createReforgedArmor(qualityLeatherArmor, armorMaterial);
    createWarforgedArmor(qualityLeatherArmor, reforgedArmor, armorMaterial);
    if (Extensions.GetRecordKeywordEDIDs(qualityLeatherArmor).includes(`DaedricArtifact`)){
      doDaedricReplicas(rec, armorMaterial);
    }
  }


  //-----------------Actual Armor Patcher Functions----------------------------------
  /*Every function feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  function loadAndPatch_Armors() {
    return {
      load: {//armors not clothes
        signature: `ARMO`,
        filter: record => {//Called for each loaded record. Return false to skip patching a record
          let keywords = Extensions.GetRecordKeywordEDIDs(record)
          return !xelib.HasElement(record,`TNAM`)
          && !keywords.some(kw => ClothingKeywords[kw])
          && !keywords.some(kw => JewelryKeywords[kw])
          && (getArmorMaterial(record) !== null);
        }
      },
      patch: function (record) {
        let armorMaterial = getArmorMaterial(record);
        doArmorKeywords(record, armorMaterial);
        if (settings.UseWarrior){
          setArmorValue(record, armorMaterial);
          applyArmorModfiers(record);
        }
        if (settings.UseThief){
          addMasqueradeKeywords(record);
        }
      }
    };
  }

  function loadAndPatch_Clothes(){
    return {
      load: {//add ClothingRich keyword to ClothingBody clothes valued higher than the threshold
        signature: `ARMO`,
        filter: record => {//Called for each loaded record. Return false to skip patching a record
          let keywords = Extensions.GetRecordKeywordEDIDs(record)
          return settings.UseThief 
          && !xelib.HasElement(record,`TNAM`)
          && keywords.includes(`ClothingBody`)
          && !keywords.includes(`ClothingRich`)
          && !keywords.includes(`ClothingPoor`)
          && !keywords.some(kw => JewelryKeywords[kw])
          && xelib.GetValue(record, `DATA\\Value`) >= expensiveClothingThreshold;
        }
      },
      patch: function (record) {
        Extensions.addLinkedArrayItem(record, `KWDA`, locals.skyrimKeywords.ClothingRich);
      }
    };
  }

  const records_AllARMO = {
    
      records: (filesToPatch, helpers, settings, locals) => {
        //patch things that need to be used, but not themselves changed in the patch
        if (settings.UseWarrior) {
          helpers.logMessage(`Getting clothes`);
          let clothes = helpers.loadRecords('ARMO')
          .filter(rec => {//Called for each loaded record. Return false to skip patching a record
            let keywords = Extensions.GetRecordKeywordEDIDs(rec);
            return !xelib.HasElement(rec,`TNAM`)
            && keywords.some(kw => ClothingKeywords[kw])
            && !keywords.some(kw => JewelryKeywords[kw])
            && !xelib.GetRecordFlag(rec,`Non-Playable`);//comment this to do non-playable ARMOs
          });
          helpers.logMessage(`Adding clothing meltdown recipes`);
          clothes.forEach(rec => {
            addClothingMeltdownRecipe(rec);
          });
          helpers.logMessage(`Done adding clothing meltdown recipes`);

          helpers.logMessage(`Getting armors`);
          let armors = helpers.loadRecords('ARMO')
          .filter(rec => {//Called for each loaded record. Return false to skip patching a record
            let keywords = Extensions.GetRecordKeywordEDIDs(rec);
            return !xelib.HasElement(rec,`TNAM`)
            && !keywords.some(kw => ClothingKeywords[kw])
            && !keywords.some(kw => JewelryKeywords[kw])
            && !(keywords.includes(`DaedricArtifact`)
              || xelib.GetHexFormID(rec) == 0xD2846)
            && (getArmorMaterial(rec) !== null)
            && ReforgeAllowed(rec);
          });
          helpers.logMessage(`Adding armor recipes`);
          armors.forEach(rec => {
            let armorMaterial = getArmorMaterial(rec);
            addArmorMeltdownRecipe(rec, armorMaterial);
            let reforgedArmor = createReforgedArmor(rec, armorMaterial);
            createWarforgedArmor(rec, reforgedArmor, armorMaterial);
          });
          helpers.logMessage(`Done adding armor recipes`);

          helpers.logMessage(`Getting daedric armor artifacts`);
          let artifacts = helpers.loadRecords('ARMO')//add replicas for daedric artifacts
          .filter(rec => {
            let keywords = Extensions.GetRecordKeywordEDIDs(rec);
            return !keywords.includes(kw => kw === `ArmorPerMaForged`)
            && (keywords.includes(`DaedricArtifact`)
            || xelib.GetHexFormID(rec) == 0xD2846)
            && !keywords.some(kw => JewelryKeywords[kw])
          });
          helpers.logMessage(`Adding daedric armor artifact duplicates`);
          //set up daedric duplication here
          artifacts.forEach(rec => {
            let armorMaterial = getArmorMaterial(rec);
            doDaedricReplicas(rec, armorMaterial);
          });
          helpers.logMessage(`Done adding daedric armor artifact duplicates`);
        }

        if (settings.UseThief){
          helpers.logMessage(`Getting craftable leather armors`);
          let leatherArmorCOBJ = {craft: [], temper: []};
          let leatherArmors = helpers.loadRecords('ARMO')
          .filter(rec => {
            let keywords = Extensions.GetRecordKeywordEDIDs(rec)
            return !keywords.includes(kw => kw === `ArmorPerMaForged`)
            && keywords.includes(`ArmorMaterialLeather`)
            && !xelib.HasElement(rec,`TNAM`)
            && !xelib.EditorID(rec).includes('Reforged')
            && !xelib.EditorID(rec).includes('Warforged')
            && getLeatherArmorCOBJ(rec, leatherArmorCOBJ)
          });
          helpers.logMessage(`Adding quality leather armors`);
          let armorMaterial = {
            "materialMeltdown": "QualityLeather",
            "materialTemper": "QualityLeather"
          };
          leatherArmors.forEach(rec => {
            doQualityLeather(rec, armorMaterial, leatherArmorCOBJ);
          });
          helpers.logMessage(`Done adding quality leather armors`);
        }
        return [];
      }
  }

  return {
    loadAndPatch_Armors,
    loadAndPatch_Clothes,
    records_AllARMO
  };
};