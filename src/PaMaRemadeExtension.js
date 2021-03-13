module.exports = function({xelib, fh, patcherPath, patchFile, settings, helpers, locals}){
  const constants = {
		equalTo: `10000000`,
		greaterThanEqualTo: `11000000`,
    exclusionMap: {
      NAME: 'Name',
      EDID: 'EditorID',
      CONTAINS: 'contains',
      STARTSWITH: 'startsWith',
      EQUALS: 'EQUALS'
    },
    stringToBoolean: {
      "true": true,
      "false": false
    }
	};
  //---------------------Useful Functions----------------------------
  //ironically unused
  function getNativeFormID(pluginFileHandle, localFormId) {
    let masterCount = xelib.ElementCount(pluginFileHandle, '[0]\\Master Files');
    return masterCount * 0x1000000 + localFormId;
  }

  // returns an array of keyword EDIDs for a given record
  function GetRecordKeywordEDIDs(rec){
    let keywords = [];
      if (xelib.HasElement(rec, `KWDA`)){
        xelib.GetElements(rec, 'KWDA').forEach((e) => {
          let ref = xelib.GetLinksTo(e);
          if (ref) keywords.push(xelib.EditorID(ref));
        })
      }
    return keywords;
  }

  //adds a condition up to parameter #1
  function addLinkedCondition(id, condFunc, compVal, Type, p1){
    let newCond = xelib.AddArrayItem(id, `Conditions`, '', '');
    xelib.SetValue(newCond, 'CTDA\\Function', condFunc);
    xelib.SetValue(newCond, 'CTDA\\Comparison Value', compVal);
    xelib.SetValue(newCond, 'CTDA\\Type', Type);
    xelib.SetLinksTo(newCond, 'CTDA\\Parameter #1', p1);//zedit wiki says SetLinks to is "id, id2, path", but this way works as well. Not sure why
  }

  //analogous to AddElementValue but you pass a handle instead of a string
  function addLinkedElementValue(id, path, val, substring = ''){
    let newValue = xelib.AddElement(id, path);
    xelib.SetLinksTo(newValue, substring, val);//zedit wiki says SetLinks to is "id, id2, path", but this way works as well. Not sure why
    return newValue;
  }

  //analogous to addLinkdedElementValue but for array items like Keywords or Items, etc
  function addLinkedArrayItem(id, path, val, substring = ''){
    let newValue = xelib.AddArrayItem(id, path, '', '');
    xelib.SetLinksTo(newValue, substring, val);//zedit wiki says SetLinks to is "id, id2, path", but this way works as well. Not sure why
    return newValue;
  }

  function getFormStr(rec){
    return (
      `${xelib.GetHexFormID(rec).slice(2,)}${xelib.LongPath(xelib.GetMasterRecord(rec))
        .slice(0,xelib.LongPath(xelib.GetMasterRecord(rec)).indexOf(".")+4)}`
    );
  }

  //Mimics T3ndo's EDID naming system
  function namingMimic(rec) {
    let itemName
    if (xelib.HasElement(rec,`FULL`)) 
        {itemName = xelib.GetValue(rec,`FULL`).toPascalCase()}
    else 
        {itemName = `<NOTEXT>`}
    return `${itemName}${getFormStr(rec)}`
    //this is the most disgusting naming system 
    //I've ever witnessed, and it still doesn't match T3nd0's exactly
    //but his has more <NOTEXT>s than mine so this should be fine
  }

  function getFileIDs(filesToPatch){//from Victor, this returns handles to each of the files in filesToPatch, unused
    return filesToPatch.map(filename => filename in locals.fileDict? locals.fileDict[filename]: locals.fileDict[filename] = xelib.FileByName(filename));
  }

  function getRecordsToPatch(filesToPatch){
    let files = getFileIDs(filesToPatch);
    files.push(patchFile);
    let recs = files.map(file => xelib.GetRecords(file, 'ARMO', true))
      .reduce((a, b) => a.concat(b), []),
      fids = recs.map(rec => xelib.GetHexFormID(rec));
    recs = recs.filter((rec, index) => fids.lastIndexOf(xelib.GetHexFormID(rec)) === index);
    return recs
  }

  function getObjectFromBinding(rec, bindingObject, targetObject){
    /*example using armor patcher: this block finds the pseudo material based on matching text in the armor's name with 
    pre-defined strings. These strings are called binding identifiers.*/
    let recordName = xelib.GetValue(rec,`FULL`);
    let maxHitSize = 0;
    let bestHit = null;
    let currentHitSize = 0;
    let currentHit = null;
    bindingObject.forEach(binding =>  {
      if (recordName.includes(binding.substring)) {
        currentHit = binding.identifier;
        currentHitSize = binding.substring.length
        if (currentHitSize> maxHitSize){
          maxHitSize = currentHitSize;
          bestHit = currentHit;
        }
      }
    });
    /*example continued: this block links the binding identifier that best matches the armor's name to the armor 
    material it should be given.*/
    let target = null
    targetObject.forEach(subObject => {
      if (bestHit === subObject.identifier){         
        target = subObject;
      }
    })
    return target;
  }

  //---------------------Custom Record Copying Functions----------------------------
  const RecordObjectFunctions = {
    getRecordObject: function(rec) {
      return {
        isCopy: (xelib.Name(xelib.GetElementFile(rec)) === settings.patchFileName), 
        handle: rec
      };
    },// use with let Record = getRecordObject(rec);

    copyRecord: recordObject => {//this edits recordObject up through all scopes up to and including the scope in which it was delcared
      let rec = recordObject.handle
      recordObject.isCopy = true;
      recordObject.handle = xelib.CopyElement(rec, patchFile);
    }//use with if (!Record.isCopy){copyRecord(Record);}
  };

  //---------------------Initialization----------------------------
  //this solution breaks language support. Need to load Languages.xml somehow
  function initLocals() {//everything on locals is created here
    locals.armorJson = fh.loadJsonFile(`${patcherPath}/PMxml/Armor.json`, 0);
    locals.alchemyJson = fh.loadJsonFile(`${patcherPath}/PMxml/Alchemy.json`, 0);
    locals.ammunitionJson = fh.loadJsonFile(`${patcherPath}/PMxml/Ammunition.json`, 0);
    locals.enchantingJson = fh.loadJsonFile(`${patcherPath}/PMxml/Enchanting.json`, 0);
    locals.generalSettingsJson = fh.loadJsonFile(`${patcherPath}/PMxml/GeneralSettings.json`, 0);
    locals.leveledListsJson = fh.loadJsonFile(`${patcherPath}/PMxml/LeveledLists.json`, 0);
    locals.npcJson = fh.loadJsonFile(`${patcherPath}/PMxml/NPC.json`, 0);
    locals.weaponsJson = fh.loadJsonFile(`${patcherPath}/PMxml/Weapons.json`, 0);
    let armorObject = locals.armorJson[`ns2:armor`], alchData = locals.alchemyJson["ns2:alchemy"],
      ammoObject = locals.ammunitionJson[`ns2:ammunition`];
    locals.armorBindings = armorObject.armor_material_bindings.binding;
    locals.armorMaterial = armorObject.armor_materials.armor_material;
    locals.armorModBindings = armorObject.armor_modifier_bindings.binding;
    locals.armorModifer = armorObject.armor_modifiers.armor_modifier;
    locals.alchemyBindings = alchData.alchemy_effect_bindings.binding;
    locals.alchemyEffect = alchData.alchemy_effects.alchemy_effect;
    locals.potionMultBindings = alchData.potion_multiplier_bindings.binding;
    locals.potionMultiplier = alchData.potion_multipliers.potion_multiplier;
    locals.ingrVarBindings = alchData.ingredient_variation_bindings.binding
    locals.ingrVariation = alchData.ingredient_variations.ingredient_variation;
    locals.ammoTypeBindings = ammoObject.ammunition_type_bindings.binding;
    locals.ammoTypes = ammoObject.ammunition_types.ammunition_type;
    locals.ammoMaterialBindings = ammoObject.ammunition_material_bindings.binding;
    locals.ammoMaterials = ammoObject.ammunition_materials.ammunition_material;

    let buildEDIDMap = (handle, sig) => xelib.BuildReferenceMap(handle, sig, xelib.EditorID);
    locals.skyrimKeywords = buildEDIDMap(locals.Skyrim_Master, `KYWD`);
    locals.permaKeywords = buildEDIDMap(locals.PerkusMaximus_Master, `KYWD`);
    locals.skyrimMisc = buildEDIDMap(locals.Skyrim_Master, `MISC`);
    locals.permaMisc = buildEDIDMap(locals.PerkusMaximus_Master, `MISC`);
    locals.dragonbornMisc = buildEDIDMap(locals.dragonborn_Master, `MISC`);
    locals.skyrimPerks = buildEDIDMap(locals.Skyrim_Master, `PERK`);
    locals.permaPerks = buildEDIDMap(locals.PerkusMaximus_Master, `PERK`);
    locals.permaExplosions = buildEDIDMap(locals.PerkusMaximus_Master, `EXPL`);
    locals.skyrimIngredients = buildEDIDMap(locals.Skyrim_Master, `INGR`);
    locals.skyrimIngestibles = buildEDIDMap(locals.Skyrim_Master, `ALCH`);
    locals.permaFLists = buildEDIDMap(locals.PerkusMaximus_Master, `FLST`);


    //---------------Armor Patcher stuff------------------
    //source: src\Patchus Maximus\src\enums\BaseMaterialsArmor 
    /*Example object made with materialDef
      "ADVANCED": {
        perk: locals.skyrimPerks.AdvancedArmors,
        meltdownIngot: locals.skyrimMisc.IngotCorundum,
        meltdownCraftingStation: locals.skyrimKeywords.CraftingSmelter,
        temperIngot: locals.skyrimMisc.IngotCorundum,
      }*/
    let materialDef = (perk, meltdownIngot, meltdownCraftingStation, temperIngot) => ({perk, meltdownIngot, meltdownCraftingStation, temperIngot});
    locals.BaseMaterialsArmor = {
      "ADVANCED": materialDef(locals.skyrimPerks.AdvancedArmors, locals.skyrimMisc.IngotCorundum, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotCorundum),
      "NONE": materialDef(null, null, null, null),
      "IRON": materialDef(null, locals.skyrimMisc.IngotIron, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotIron),
      "STEEL": materialDef(locals.skyrimPerks.SteelSmithing, locals.skyrimMisc.IngotSteel, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotSteel),
      "DWARVEN": materialDef(locals.skyrimPerks.DwarvenSmithing, locals.skyrimMisc.IngotDwarven, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotDwarven),
      "FALMER": materialDef(locals.skyrimPerks.AdvancedArmors, locals.skyrimMisc.ChaurusChitin, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.ChaurusChitin),
      "ORCISH": materialDef(locals.skyrimPerks.OrcishSmithing, locals.skyrimMisc.IngotOrichalcum, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotOrichalcum),
      "STEELPLATE": materialDef(locals.skyrimPerks.AdvancedArmors, locals.skyrimMisc.IngotSteel, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotSteel),
      "EBONY": materialDef(locals.skyrimPerks.EbonySmithing, locals.skyrimMisc.IngotEbony, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotEbony),
      "DRAGONPLATE": materialDef(locals.skyrimPerks.DragonArmor, locals.skyrimMisc.DragonBone, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.DragonBone),
      "DAEDRIC": materialDef(locals.skyrimPerks.DaedricSmithing, locals.skyrimMisc.IngotEbony, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotEbony),
      "FUR": materialDef(null, locals.skyrimMisc.LeatherStrips, locals.skyrimKeywords.CraftingTanningRack, locals.skyrimMisc.LeatherStrips),
      "HIDE": materialDef(null, locals.skyrimMisc.LeatherStrips, locals.skyrimKeywords.CraftingTanningRack, locals.skyrimMisc.LeatherStrips),
      "LEATHER": materialDef(locals.permaPerks.xMASMIMaterialLeather, locals.skyrimMisc.LeatherStrips, locals.skyrimKeywords.CraftingTanningRack, locals.skyrimMisc.LeatherStrips),
      "ELVEN": materialDef(locals.skyrimPerks.ElvenSmithing, locals.skyrimMisc.IngotIMoonstone, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotIMoonstone),
      "SCALED": materialDef(locals.skyrimPerks.AdvancedArmors, locals.skyrimMisc.IngotCorundum, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotCorundum),
      "GLASS": materialDef(locals.skyrimPerks.GlassSmithing, locals.skyrimMisc.IngotMalachite, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotMalachite),
      "DRAGONSCALE": materialDef(locals.skyrimPerks.DragonArmor, locals.skyrimMisc.DragonScales, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.DragonScales),
      "STALHRIM_HEAVY": materialDef(locals.skyrimPerks.EbonySmithing, locals.dragonbornMisc.DLC2OreStalhrim, locals.skyrimKeywords.CraftingSmelter, locals.dragonbornMisc.DLC2OreStalhrim),
      "STALHRIM_LIGHT": materialDef(locals.skyrimPerks.EbonySmithing, locals.dragonbornMisc.DLC2OreStalhrim, locals.skyrimKeywords.CraftingSmelter, locals.dragonbornMisc.DLC2OreStalhrim),
      "NORDIC_HEAVY": materialDef(locals.skyrimPerks.AdvancedArmors, locals.skyrimMisc.IngotCorundum, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotSteel),
      "BONEMOLD_HEAVY": materialDef(locals.skyrimPerks.AdvancedArmors, locals.skyrimMisc.IngotIron, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotIron),
      "CHITIN": materialDef(locals.skyrimPerks.AdvancedArmors, locals.skyrimMisc.IngotCorundum, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotCorundum),
      "SILVER": materialDef(locals.permaPerks.xMASMIMaterialGoldAndSilver, locals.skyrimMisc.ingotSilver, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.ingotSilver),
      "GOLD": materialDef(locals.permaPerks.xMASMIMaterialGoldAndSilver, locals.skyrimMisc.IngotGold, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.IngotGold),
      "WOOD": materialDef(null, locals.skyrimMisc.Coal01, locals.skyrimKeywords.CraftingSmelter, locals.skyrimMisc.Firewood01),
      "QualityLeather": materialDef(locals.permaPerks.xMASMIMaterialLeather, locals.permaMisc.xMAWAYQualityLeatherStrips, locals.skyrimKeywords.CraftingTanningRack, locals.permaMisc.xMAWAYQualityLeather)
    };
  
    locals.armorTypes = {
      "HEAVY": {
        keyword: locals.skyrimKeywords.ArmorHeavy,
        ArmorType: "Heavy Armor",
        "ArmorCuirass": locals.permaKeywords.xMAArmorHeavyChest, 
        "ArmorGauntlets": locals.permaKeywords.xMAArmorHeavyArms, 
        "ArmorBoots": locals.permaKeywords.xMAArmorHeavyLegs, 
        "ArmorHelmet": locals.permaKeywords.xMAArmorHeavyHead, 
        "ArmorShield": locals.permaKeywords.xMAArmorHeavyShield
      },
      "LIGHT": {
        keyword: locals.skyrimKeywords.ArmorLight,
        ArmorType: "Light Armor",
        "ArmorCuirass": locals.permaKeywords.xMAArmorLightChest,
        "ArmorGauntlets": locals.permaKeywords.xMAArmorLightArms,
        "ArmorBoots": locals.permaKeywords.xMAArmorLightLegs,
        "ArmorHelmet": locals.permaKeywords.xMAArmorLightHead,
        "ArmorShield": locals.permaKeywords.xMAArmorLightShield
      }
    };

    locals.masqueradeFactions = {
      "BANDIT": locals.permaKeywords.xMASPEMasqueradeBanditKeyword, 
      "CULTIST": locals.permaKeywords.xMASPEMasqueradeCultistKeyword, 
      "DAWNGUARD": locals.permaKeywords.xMASPEMasqueradeDawnguardKeyword, 
      "FALMER": locals.permaKeywords.xMASPEMasqueradeFalmerKeyword, 
      "FORSWORN": locals.permaKeywords.xMASPEMasqueradeForswornKeyword, 
      "IMPERIAL": locals.permaKeywords.xMASPEMasqueradeImperialKeyword, 
      "STORMCLOAK": locals.permaKeywords.xMASPEMasqueradeStormcloakKeyword, 
      "THALMOR": locals.permaKeywords.xMASPEMasqueradeThalmorKeyword, 
      "VAMPIRE": locals.permaKeywords.xMASPEMasqueradeVampireKeyword,
      "NONE": null
    };

    locals.removeKeywords = {
      "LIGHT": locals.skyrimKeywords.ArmorHeavy,
      "HEAVY": locals.skyrimKeywords.ArmorLight
    };

    locals.likelyLeatherRecipes = helpers.loadRecords(`COBJ`)
    .filter(recipe => xelib.GetLinksTo(recipe, `CNAM`) !== 0
      && (xelib.EditorID(xelib.GetLinksTo(recipe, `BNAM`)) === `CraftingSmithingForge` 
        || xelib.EditorID(xelib.GetLinksTo(recipe, `BNAM`)) === `CraftingSmithingArmorTable`)
    );

    locals.forgedKeyword = xelib.AddElement(patchFile, `KYWD\\KYWD`);
    xelib.AddElementValue(locals.forgedKeyword, `EDID`, 'ArmorPerMaForged');
    
    //---------------Ammo Patcher stuff------------------
    let ammoDef = (name, desc, flagExplosion, flagAltTrigger, EXPL, perk, ingredients) => ({name, desc, EXPL, flagExplosion, flagAltTrigger, perk, ingredients});
    let poisonDesc = "Explodes upon impact, dealing 3 points of poison damage per second for 20 seconds.",
      fireDesc = "Explodes upon impact, dealing 30 points of fire damage.",
      frostDesc = "Explodes upon impact, dealing 30 points of frost damage.",
      shockDesc = "Explodes upon impact, dealing 30 points of shock damage.",
      lightsourceDesc = "Emits light after being fired.",
      explosiveDesc = "Explodes upon impact, dealing 60 points of non-elemental damage.",
      timebombDesc = "Explodes 3 seconds after being fired into a surface, dealing 150 points of non-elemental damage.",
      strongDesc = "",
      strongestDesc = "",
      barbedDesc = "Deals 6 points of bleeding damag per second over 8 seconds, and slows the target down by 20%.";

    locals.variantTypes = {
      "poison": ammoDef("Poisoned", poisonDesc, true, false, locals.permaExplosions.xMAALCPoisonBurstAmmoPoisonExplosion, locals.permaPerks.xMAALCPoisonBurst,  [locals.skyrimIngredients.deathBell]),
      "fire": ammoDef("Fire", fireDesc, true, false, locals.permaExplosions.xMAALCElementalBurstExplosionFire, locals.permaPerks.xMAALCElementalBombard, [locals.skyrimIngredients.FireSalts]),
      "frost": ammoDef("Frost", frostDesc, true, false, locals.permaExplosions.xMAALCElementalBurstExplosionFrost, locals.permaPerks.xMAALCElementalBombard, [locals.skyrimIngredients.FrostSalts]),
      "shock": ammoDef("Shock", shockDesc, true, false, locals.permaExplosions.xMAALCElementalBurstExplosionShock, locals.permaPerks.xMAALCElementalBombard, [locals.skyrimIngredients.VoidSalts]),
      "lightsource": ammoDef("Lightsource", lightsourceDesc, false, false, null, locals.permaPerks.xMASNEThiefsToolbox0, [locals.skyrimIngredients.FireflyThorax, locals.skyrimMisc.LeatherStrips]),
      "explosive": ammoDef("Explosive", explosiveDesc, true, false, locals.permaExplosions.xMAALCFuseExplosion, locals.permaPerks.xMAALCFuse, [locals.skyrimIngredients.FireflyThorax, locals.skyrimIngestibles.Ale]),
      "timebomb": ammoDef("Timebomb", timebombDesc, true, true, locals.permaExplosions.xMAALCAdvancedExplosivesMissileExplosion, locals.permaPerks.xMAALCAdvancedExplosives, [locals.skyrimIngredients.FireflyThorax, locals.skyrimIngestibles.Ale, locals.skyrimMisc.Charcoal]),
      "strong": ammoDef("Strong", strongDesc, false, false, null, locals.permaPerks.xMARANAdvancedMissilecraft0, [locals.skyrimMisc.IngotIron]),
      "strongest": ammoDef("Strongest", strongestDesc, false, false, null, locals.permaPerks.xMARANAdvancedMissilecraft0, [locals.skyrimMisc.IngotSteel]),
      "barbed": ammoDef("Barbed", barbedDesc, true, false, locals.permaExplosions.xMARANAdvancedMissilecraft1BarbedExplosion, locals.permaPerks.xMARANAdvancedMissilecraft1, [locals.skyrimMisc.IngotIron, locals.skyrimMisc.IngotSteel])
    };
  };

  records_reportITPOs = {
    records: (filesToPatch, helpers, settings, locals) => {
      let overrides = xelib.GetRecords(patchFile, ``, true)
      .filter(rec => !xelib.IsMaster(rec)
       && xelib.IsWinningOverride(rec))
      overrides.forEach(rec => {
        let WinningOverrideArray = xelib.GetNodeElements(xelib.GetNodes(rec), rec);
        let  poom = xelib.GetPreviousOverride(rec, patchFile); //previousOverrideOrMaster
        let pooma = xelib.GetNodeElements(xelib.GetNodes(poom), poom); //previousOverrideOrMasterArray
        if (WinningOverrideArray.length === pooma.length) {
          for (i=0; i<pooma.length; i++){
            if (xelib.GetValue(WinningOverrideArray[i] ,``) === xelib.GetValue(pooma[i] ,``)){
              console.log(`ITPO found: ${xelib.EditorID(rec)}`);
            }
          };
        };
      });
      return [];
    }
  };

  return {
    constants,
    /*getNativeFormID,*/
    GetRecordKeywordEDIDs,
    addLinkedCondition,
    addLinkedElementValue, 
    addLinkedArrayItem, 
    getFormStr,
    namingMimic, 
    RecordObjectFunctions, 
    /*getFileIDs,*/
    getRecordsToPatch,
    getObjectFromBinding, 
    initLocals,
    records_reportITPOs
  };
}