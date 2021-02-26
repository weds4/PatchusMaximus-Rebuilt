//---------------------Useful Functions----------------------------
//ironically unused
function getNativeFormID(pluginFileHandle, localFormId) {
  let masterCount = xelib.ElementCount(pluginFileHandle, '[0]\\Master Files');
  return masterCount * 0x1000000 + localFormId;
};

// returns an array of keyword EDIDs for a given record
function GetRecordKeywordEDIDs(rec){
  let keywords = [];
    if (xelib.HasElement(rec, `KWDA`)){
      xelib.GetElements(rec, 'KWDA').forEach((e) => {
        let ref = xelib.GetLinksTo(e);
        if (ref) keywords.push(xelib.EditorID(ref));
      });
    };
  return keywords;
};

//adds a condition up to parameter #1
function addLinkedCondition(id, condFunc, compVal, Type, p1){
  let newCond = xelib.AddArrayItem(id, `Conditions`, '', '');
  xelib.SetValue(newCond, 'CTDA\\Function', condFunc);
  xelib.SetValue(newCond, 'CTDA\\Comparison Value', compVal);
  xelib.SetValue(newCond, 'CTDA\\Type', Type);
  xelib.SetLinksTo(newCond, 'CTDA\\Parameter #1', p1);
};

//analogous to AddElementValue but you pass a handle instead of a string
function addLinkedElementValue(id, path, val, substring = ''){
  let newValue = xelib.AddElement(id, path);
  xelib.SetLinksTo(newValue, substring, val);
  return newValue;
};

//analogous to addLinkdedElementValue but for array items like Keywords or Items, etc
function addLinkedArrayItem(id, path, val, substring = ''){
  let newValue = xelib.AddArrayItem(id, path, '', '');
  xelib.SetLinksTo(newValue, substring, val);
  return newValue;
};

//Mimics T3ndo's EDID naming system
function namingMimic(rec) {
  let itemName
  if (xelib.HasElement(rec,`FULL`)) 
      {itemName = xelib.GetValue(rec,`FULL`).toPascalCase()}
  else 
      {itemName = `<NOTEXT>`}
  return `${itemName}${xelib.GetHexFormID(rec).slice(2,)}`+
  `${xelib.LongPath(xelib.GetMasterRecord(rec))
      .slice(0,xelib.LongPath(xelib.GetMasterRecord(rec)).indexOf(".")+4)}`
  //this is the most disgusting naming system 
  //I've ever witnessed, and it still doesn't match T3nd0's exactly
  //but his has more <NOTEXT>s than mine so this should be fine
};

function getObjectFromBinding(rec, bindingObject, targetObject){
  /*exmaple using armor patcher: this block finds the pseudo material based on matching text in the armor's name with 
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
      };
    };
  });
  /*example cont: this block links the binding identifier that best matches the armor's name to the armor 
  material it should be given.*/
  let target = null
  targetObject.forEach(subObject => {
    if (bestHit === subObject.identifier){         
      target = subObject;
    };
  });
  return target;
};

//---------------------Initialization----------------------------
//this solution breaks language support. Need to load Languages.xml somehow
function initJSONs (fh, locals, patcherPath) {
  locals.armorJson = fh.loadJsonFile(`${patcherPath}/PMxml/Armor.json`, 0);
  locals.alchemyJson = fh.loadJsonFile(`${patcherPath}/PMxml/Alchemy.json`, 0);
  locals.ammunitionJson = fh.loadJsonFile(`${patcherPath}/PMxml/Ammunition.json`, 0);
  locals.enchantingJson = fh.loadJsonFile(`${patcherPath}/PMxml/Enchanting.json`, 0);
  locals.generalSettingsJson = fh.loadJsonFile(`${patcherPath}/PMxml/GeneralSettings.json`, 0);
  locals.leveledListsJson = fh.loadJsonFile(`${patcherPath}/PMxml/LeveledLists.json`, 0);
  locals.npcJson = fh.loadJsonFile(`${patcherPath}/PMxml/NPC.json`, 0);
  locals.weaponsJson = fh.loadJsonFile(`${patcherPath}/PMxml/Weapons.json`, 0);
  locals.armorBindings = locals.armorJson[`ns2:armor`].armor_material_bindings.binding;
  locals.armorMaterial = locals.armorJson[`ns2:armor`].armor_materials.armor_material;
  locals.armorModBindings = locals.armorJson[`ns2:armor`].armor_modifier_bindings.binding;
  locals.armorModifer = locals.armorJson[`ns2:armor`].armor_modifiers.armor_modifier;
  locals.alchemyBindings = locals.alchemyJson["ns2:alchemy"].alchemy_effect_bindings.binding;
  locals.alchemyEffect = locals.alchemyJson["ns2:alchemy"].alchemy_effects.alchemy_effect;
  locals.potionMultBindings = locals.alchemyJson["ns2:alchemy"].potion_multiplier_bindings.binding;
  locals.potionMultiplier = locals.alchemyJson["ns2:alchemy"].potion_multipliers.potion_multiplier;
  locals.ingrVarBindings = locals.alchemyJson["ns2:alchemy"].ingredient_variation_bindings.binding
  locals.ingrVariation = locals.alchemyJson["ns2:alchemy"].ingredient_variations.ingredient_variation;
};

function initRefMaps(locals){
  locals.skyrimKeywords =
    xelib.BuildReferenceMap(locals.Skyrim_Master, `KYWD`, xelib.EditorID);
  locals.permaKeywords = 
    xelib.BuildReferenceMap(locals.PerkusMaximus_Master, 'KYWD', xelib.EditorID);
  locals.skyrimMisc = 
    xelib.BuildReferenceMap(locals.Skyrim_Master, `MISC`, xelib.EditorID);
  locals.permaMisc = 
    xelib.BuildReferenceMap(locals.PerkusMaximus_Master, `MISC`, xelib.EditorID);
  locals.dragonbornMisc = 
    xelib.BuildReferenceMap(locals.dragonborn_Master, `MISC`, xelib.EditorID);
  locals.skyrimPerks = 
    xelib.BuildReferenceMap(locals.Skyrim_Master, `PERK`, xelib.EditorID);
  locals.permaPerks = 
    xelib.BuildReferenceMap(locals.PerkusMaximus_Master, `PERK`, xelib.EditorID);
};

function initArmorPatcher(locals) {
  //Extensions = require(`${locals.patcherPath}/src/PaMaRemadeExtension.js`)
  //source: src\Patchus Maximus\src\enums\BaseMaterialsArmor 
  locals.BaseMaterialsArmor = {
    "ADVANCED": {
      perk: locals.skyrimPerks.AdvancedArmors,
      meltdownIngot: locals.skyrimMisc.IngotCorundum,
      meltdownCraftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotCorundum,
    },
    "NONE": {
      perk: null,
      meltdownIngot: null,
      craftingStation: null,
      temperIngot: null,
    },
    "IRON": {
      perk: null,
      meltdownIngot: locals.skyrimMisc.IngotIron,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotIron,
    },
    "STEEL": {
      perk: locals.skyrimPerks.SteelSmithing,
      meltdownIngot: locals.skyrimMisc.IngotSteel,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotSteel,
    },
    "DWARVEN": {
      perk: locals.skyrimPerks.DwarvenSmithing,
      meltdownIngot: locals.skyrimMisc.IngotDwarven,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotDwarven,
    },
    "FALMER": {
      perk: locals.skyrimPerks.AdvancedArmors,
      meltdownIngot: locals.skyrimMisc.ChaurusChitin,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.ChaurusChitin,
    },
    "ORCISH": {
      perk: locals.skyrimPerks.OrcishSmithing,
      meltdownIngot: locals.skyrimMisc.IngotOrichalcum,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotOrichalcum,
    },
    "STEELPLATE": {
      perk: locals.skyrimPerks.AdvancedArmors,
      meltdownIngot: locals.skyrimMisc.IngotSteel,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotSteel,
    },
    "EBONY": {
      perk: locals.skyrimPerks.EbonySmithing,
      meltdownIngot: locals.skyrimMisc.IngotEbony,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotEbony,
    },
    "DRAGONPLATE": {
      perk: locals.skyrimPerks.DragonArmor,
      meltdownIngot: locals.skyrimMisc.DragonBone,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.DragonBone,
    },
    "DAEDRIC": {
      perk: locals.skyrimPerks.DaedricSmithing,
      meltdownIngot: locals.skyrimMisc.IngotEbony,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotEbony,
    },
    "FUR": {
      perk: null,
      meltdownIngot: locals.skyrimMisc.LeatherStrips,
      craftingStation: locals.skyrimKeywords.CraftingTanningRack,
      temperIngot: locals.skyrimMisc.LeatherStrips,
    },
    "HIDE": {
      perk: null,
      meltdownIngot: locals.skyrimMisc.LeatherStrips,
      craftingStation: locals.skyrimKeywords.CraftingTanningRack,
      temperIngot: locals.skyrimMisc.LeatherStrips,
    },
    "LEATHER": {
      perk: locals.permaPerks.xMASMIMaterialLeather,
      meltdownIngot: locals.skyrimMisc.LeatherStrips,
      craftingStation: locals.skyrimKeywords.CraftingTanningRack,
      temperIngot: locals.skyrimMisc.LeatherStrips,
    },
    "ELVEN": {
      perk: locals.skyrimPerks.ElvenSmithing,
      meltdownIngot: locals.skyrimMisc.IngotIMoonstone,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotIMoonstone,
    },
    "SCALED": {
      perk: locals.skyrimPerks.AdvancedArmors,
      meltdownIngot: locals.skyrimMisc.IngotCorundum,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotCorundum,
    },
    "GLASS": {
      perk: locals.skyrimPerks.GlassSmithing,
      meltdownIngot: locals.skyrimMisc.IngotMalachite,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotMalachite,
    },
    "DRAGONSCALE": {
      perk: locals.skyrimPerks.DragonArmor,
      meltdownIngot: locals.skyrimMisc.DragonScales,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.DragonScales,
    },
    "STALHRIM_HEAVY": {
      perk: locals.skyrimPerks.EbonySmithing,
      meltdownIngot: locals.dragonbornMisc.DLC2OreStalhrim,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.dragonbornMisc.DLC2OreStalhrim,
    },
    "STALHRIM_LIGHT": {
      perk: locals.skyrimPerks.EbonySmithing,
      meltdownIngot: locals.dragonbornMisc.DLC2OreStalhrim,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.dragonbornMisc.DLC2OreStalhrim,
    },
    "NORDIC_HEAVY": {
      perk: locals.skyrimPerks.AdvancedArmors,
      meltdownIngot: locals.skyrimMisc.IngotCorundum,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotSteel,
    },
    "BONEMOLD_HEAVY": {
      perk: locals.skyrimPerks.AdvancedArmors,
      meltdownIngot: locals.skyrimMisc.IngotIron,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotIron,
    },
    "CHITIN": {
      perk: locals.skyrimPerks.AdvancedArmors,
      meltdownIngot: locals.skyrimMisc.IngotCorundum,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotCorundum,
    },
    "SILVER": {
      perk: locals.permaPerks.xMASMIMaterialGoldAndSilver,
      meltdownIngot: locals.skyrimMisc.ingotSilver,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.ingotSilver,
    },
    "GOLD": {
      perk: locals.permaPerks.xMASMIMaterialGoldAndSilver,
      meltdownIngot: locals.skyrimMisc.IngotGold,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.IngotGold,
    },
    "WOOD": {
      perk: null,
      meltdownIngot: locals.skyrimMisc.Coal01,
      craftingStation: locals.skyrimKeywords.CraftingSmelter,
      temperIngot: locals.skyrimMisc.Firewood01,
    },
    "QualityLeather":
    {
      perk: locals.permaPerks.xMASMIMaterialLeather,
      meltdownIngot: locals.permaMisc.xMAWAYQualityLeatherStrips,
      craftingStation: locals.skyrimKeywords.CraftingTanningRack,
      temperIngot: locals.permaMisc.xMAWAYQualityLeather,
    }
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
  locals.likelyLeatherRecipes = xelib.GetRecords(0, `COBJ`)
  .map(rec => xelib.GetWinningOverride(rec))
  .filter(recipe => xelib.GetLinksTo(recipe, `CNAM`) !== 0
    && (xelib.EditorID(xelib.GetLinksTo(recipe, `BNAM`)) === `CraftingSmithingForge` 
      || xelib.EditorID(xelib.GetLinksTo(recipe, `BNAM`)) === `CraftingSmithingArmorTable`)
  );
};

function records_reportITPOs(patchFile, settings, helpers, locals) {
  return {
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

      return []
    }
  };
};

module.exports = {/*getNativeFormID,*/ GetRecordKeywordEDIDs, addLinkedCondition, 
  addLinkedElementValue, addLinkedArrayItem, namingMimic, getObjectFromBinding, initJSONs, 
  initRefMaps, initArmorPatcher, records_reportITPOs
};