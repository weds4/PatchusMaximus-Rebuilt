//--------------------- Conditions----------------------------
let equalTo = `10000000`;
let greaterThanEqualTo = `11000000`;

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
  return newValue
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
/*
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

let JewelryKeywords ={
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
};*/
/*
let expensiveClothingThreshold = 50;

let armorMeltdownOutput = {
  'ArmorCuirass': "meltdownOutputBody",
  'ArmorGauntlets': "meltdownOutputHands",
  'ArmorBoots': "meltdownOutputFeet",
  'ArmorHelmet': "meltdownOutputHead",
  'ArmorShield': "meltdownOutputShield"
};

function getArmorMeltdownOutput(locals, rec) {
  let count = 0
  GetRecordKeywordEDIDs(rec).some(kw => {
    let test = armorMeltdownOutput[kw];
    if (test) {
      count = locals.armorJson["ns2:armor"].armor_settings[test]
      return true
    };
  });
  return count.toString();//I don't like giving 0 material (this case *is* used occasionally)
};

function addClothingMeltdownRecipe (PerMaPatch,rec, locals) {
  let newRecipe = xelib.AddElement(PerMaPatch,`Constructible Object\\COBJ`);
  xelib.AddElementValue(newRecipe,`EDID`,`PaMa_CLOTH_MELTDOWN_`+namingMimic(rec));
  let newItem = addLinkedArrayItem(newRecipe, `Items`, rec, `CNTO\\Item`);
  xelib.SetValue(newItem, `CNTO\\Count`, '1');
  addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, rec);
  addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, locals.permaPerks.xMASMIMeltdown);
  addLinkedElementValue(newRecipe, 'CNAM', locals.skyrimMisc.LeatherStrips); //Created Object
  addLinkedElementValue(newRecipe, 'BNAM', locals.skyrimKeywords.CraftingTanningRack); //Workbench Keyword
  xelib.AddElementValue(newRecipe, `NAM1`, getArmorMeltdownOutput(locals, rec)); //Created Object Count
};

function getArmorMaterial(locals, rec){
  /*this block finds the pseudo material based on matching text in the armor's name with 
  pre-defined strings. These strings are called binding identifiers.
  let armorName = xelib.GetValue(rec,`FULL`);
  let armorMaterialBindingObject = locals.armorJson[`ns2:armor`].armor_material_bindings.binding;
  let maxHitSize = 0;
  let bestHit = null;
  let currentHitSize = 0;
  let currentHit = null;
  armorMaterialBindingObject.forEach(binding =>  {
    if (armorName.includes(binding.substring)) {
      currentHit = binding.identifier;
      currentHitSize = binding.substring.length
      if (currentHitSize> maxHitSize){
        maxHitSize = currentHitSize;
        bestHit = currentHit;
      };
    };
  });
  /*this block links the binding identifier that best matches the armor's name to the armor 
  material it should be given.
  let armorMaterialObject = locals.armorJson[`ns2:armor`].armor_materials.armor_material;
  let armorMaterial = null
  armorMaterialObject.forEach(mat => {
    if (bestHit === mat.identifier){         
      armorMaterial = mat;
    };
  });
  return armorMaterial;
};

function doArmorKeywords (locals, rec, armorMaterial){
  //determine if this armor material is light or heavy, 
  //and assign the appropriate keywords 
  let keywords = GetRecordKeywordEDIDs(rec);
  let thisArmorType = locals.armorTypes[armorMaterial.type]
  if (keywords.includes(xelib.EditorID(locals.removeKeywords[armorMaterial.type]))){
    xelib.RemoveKeyword(rec, xelib.GetHexFormID(locals.removeKeywords[armorMaterial.type]));
  };
  if (thisArmorType){
    if (!keywords.includes(xelib.EditorID(thisArmorType.keyword))){
      //if it doesnt have the keyword, add it
      addLinkedArrayItem(rec, 'KWDA', thisArmorType.keyword);
    };
    if (xelib.HasElement(rec, `[BOD2|BODT]\\Armor Type`)) {
      if(!(xelib.GetValue(rec,`[BOD2|BODT]\\Armor Type`) === thisArmorType.ArmorType)){
        xelib.SetValue(rec,`[BOD2|BODT]\\Armor Type`, thisArmorType.ArmorType)
      };
    };
    keywords.forEach(kw => {
      if (armorSlotKeywords[kw]) {addLinkedArrayItem(rec, `KWDA`, thisArmorType[kw]);}
    }); 
  };
};

let armorSlotMultiplier = {
  'ArmorCuirass': "armorFactorBody",
  'ArmorGauntlets': "armorFactorHands",
  'ArmorBoots': "armorFactorFeet",
  'ArmorHelmet': "armorFactorHead",
  'ArmorShield': "armorFactorShield"
};

function setArmorValue(locals, rec, armorMaterial){
  let originalAR = xelib.GetValue(rec, `DNAM`);
  let armorSlotMult = 0
  GetRecordKeywordEDIDs(rec).some(kw => {
    let test = armorSlotMultiplier[kw]
    if (test) {
      armorSlotMult = locals.armorJson["ns2:armor"].armor_settings[test]
      return true
    };
  });
  let newAR = armorMaterial.armorBase * armorSlotMult
  if (newAR > originalAR && newAR > 0) {
    xelib.SetValue(rec, `DNAM`, newAR.toString());
  };
};

function getArmorModifier(locals, rec){
  let armorName = xelib.GetValue(rec,`FULL`);
  let armorModifierBindingObject = locals.armorJson[`ns2:armor`].armor_modifier_bindings.binding;
  let maxHitSize = 0;
  let bestHit = null;
  let currentHitSize = 0;
  let currentHit = null;
  armorModifierBindingObject.forEach(binding =>  {
    if (armorName.includes(binding.substring)) {
      currentHit = binding.identifier;
      currentHitSize = binding.substring.length
      if (currentHitSize> maxHitSize){
        maxHitSize = currentHitSize;
        bestHit = currentHit;
      };
    };
  });
  let armorModifierObject = locals.armorJson[`ns2:armor`].armor_modifiers.armor_modifier;
  let armorModifier = null
  armorModifierObject.forEach(mod => {
    if (bestHit === mod.identifier){         
      armorModifier = mod;
    };
  });
  return armorModifier;
};

function applyArmorModfiers(locals, rec){
  let armorMod = getArmorModifier(locals, rec);
  if (armorMod != null){
    let current = xelib.GetValue(rec, `DATA\\Weight`);
    xelib.SetValue(rec, `DATA\\Weight`, (current*armorMod.factorWeight).toString());
    current = xelib.GetValue(rec, `DATA\\Value`);
    xelib.SetValue(rec, `DATA\\Value`, Math.round(current*armorMod.factorValue).toString());
    current = xelib.GetValue(rec, `DNAM`);
    xelib.SetValue(rec, `DNAM`, (current*armorMod.factorArmor).toString());
  };
};

function addMasqueradeKeywords(locals, rec){
  let armorName = xelib.GetValue(rec,`FULL`);
  let armorMasqueradeBindingObject = locals.armorJson[`ns2:armor`].armor_masquerade_bindings.armor_masquerade_binding;
  let keywordList = []
  armorMasqueradeBindingObject.forEach(binding =>  {
    if (armorName.includes(binding.substringArmor)) {
        keywordList.push(binding.masqueradeFaction);
    };
  });
  if (keywordList) {
    keywordList.forEach(kw => {
      if (kw) {addLinkedArrayItem(rec, `KWDA`, locals.masqueradeFactions[kw])};
    });
  };
};

let reforgeMap = {
  NAME: 'Name',
  EDID: 'EditorID',
  CONTAINS: 'contains',
  STARTSWITH: 'startsWith',
  EQUALS: 'EQUALS'
};

function ReforgeAllowed(locals, rec){
  if (xelib.GetRecordFlag(rec,`Non-Playable`)) {return false}
  else {
    let reforgeRules = locals.armorJson[`ns2:armor`].reforge_exclusions.exclusion;
    return reforgeRules.every(rule => {
      let target = xelib[reforgeMap[rule.target]](rec);
      let method = reforgeMap[rule.type];
      if(method === 'EQUALS') return target !== rule.text;
      return !target[method](rule.text);
    });
  };
};

function addArmorMeltdownRecipe(PerMaPatch, locals, rec, armorMaterial){
  let materialMeltdown = armorMaterial.materialMeltdown;
  if (materialMeltdown !== "NONE"){
    let requiredPerk = locals.BaseMaterialsArmor[materialMeltdown].perk;
    let output = locals.BaseMaterialsArmor[materialMeltdown].meltdownIngot;
    let benchKW = locals.BaseMaterialsArmor[materialMeltdown].craftingStation;
    let newRecipe = xelib.AddElement(PerMaPatch,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_MELTDOWN_${namingMimic(rec)}`);
  
    let newItem = addLinkedArrayItem(newRecipe, `Items`, rec, `CNTO\\Item`);
    xelib.SetValue(newItem, `CNTO\\Count`, '1');
  
    addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, rec);
    if (requiredPerk) {addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)};
    addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, locals.permaPerks.xMASMIMeltdown);
    addLinkedElementValue(newRecipe, 'CNAM', output); //Created Object
    addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
  
    xelib.AddElementValue(newRecipe, `NAM1`, getArmorMeltdownOutput(locals, rec)); //Created Object Count
  };
};

function addTemperingRecipe(PerMaPatch, locals, rec, armorMaterial){
  let materialTemper = armorMaterial.materialTemper;
  if (materialTemper !== `NONE`){
    let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
    let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot;
    let benchKW = locals.skyrimKeywords.CraftingSmithingArmorTable;
    let newRecipe = xelib.AddElement(PerMaPatch,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_TEMPER_${namingMimic(rec)}`);
    let newItem = addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
    xelib.SetValue(newItem, `CNTO\\Count`, '1');
    if (requiredPerk) {addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)};
    addLinkedElementValue(newRecipe, 'CNAM', rec); //Created Object
    addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
    xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
  };
};

function addReforgedArmorRecipe(PerMaPatch, locals, reforgedArmor, oldArmor, armorMaterial){
  let materialTemper = armorMaterial.materialTemper;
  if (materialTemper !== `NONE`){
    let reforgePerk = locals.permaPerks.xMASMIArmorer;
    let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
    let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot;
    let benchKW = locals.skyrimKeywords.CraftingSmithingForge;
    let newRecipe = xelib.AddElement(PerMaPatch,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_CRAFT_${namingMimic(reforgedArmor)}`);
    let newItem1 = addLinkedArrayItem(newRecipe, `Items`, oldArmor, `CNTO\\Item`);
    xelib.SetValue(newItem1, `CNTO\\Count`, '1');
    let newItem2 = addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
    xelib.SetValue(newItem2, `CNTO\\Count`, '2');
    if (requiredPerk) {addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)};
    addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, reforgePerk)
    addLinkedElementValue(newRecipe, 'CNAM', reforgedArmor); //Created Object
    addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
    xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count 
  };
};

function createReforgedArmor(PerMaPatch, locals, rec, armorMaterial){
  reforgedArmor = xelib.CopyElement(rec, PerMaPatch, true);
  oldName = xelib.GetValue(reforgedArmor, `FULL`);
  xelib.SetValue(reforgedArmor, `FULL`, `Reforged ${oldName}`);
  xelib.SetValue(reforgedArmor, `EDID`, `PaMa_ARMO_Reforged_${namingMimic(rec)}`);
  addLinkedArrayItem(reforgedArmor, `KWDA`, locals.forgedKeyword);
  applyArmorModfiers(locals, reforgedArmor);
  addReforgedArmorRecipe(PerMaPatch, locals, reforgedArmor, rec, armorMaterial);
  addArmorMeltdownRecipe(PerMaPatch, locals, reforgedArmor, armorMaterial);
  addTemperingRecipe(PerMaPatch, locals, reforgedArmor, armorMaterial);
  return reforgedArmor
};

function addWarforgedArmorRecipe(PerMaPatch, locals, warforgedArmor, reforgedArmor, armorMaterial){
  let materialTemper = armorMaterial.materialTemper;
  if (materialTemper !== `NONE`){
    let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
    let warforgePerk = locals.permaPerks.xMASMIMasteryWarforged;
    let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot;
    let benchKW = locals.skyrimKeywords.CraftingSmithingForge;
    let newRecipe = xelib.AddElement(PerMaPatch,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_CRAFT_${namingMimic(warforgedArmor)}`);
    let newItem1 = addLinkedArrayItem(newRecipe, `Items`, reforgedArmor, `CNTO\\Item`);
    xelib.SetValue(newItem1, `CNTO\\Count`, '1');
    let newItem2 = addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
    xelib.SetValue(newItem2, `CNTO\\Count`, '5');
    if (requiredPerk) {addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)};
    addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, warforgePerk)
    addLinkedElementValue(newRecipe, 'CNAM', warforgedArmor); //Created Object
    addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
    xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
  };
};

function createWarforgedArmor(PerMaPatch, locals, rec, reforgedArmor, armorMaterial){
  //rec is the corresponding reforged armor
  warforgedArmor = xelib.CopyElement(rec, PerMaPatch, true);
  oldName = xelib.GetValue(warforgedArmor, `FULL`);
  xelib.SetValue(warforgedArmor, `FULL`, `Warforged ${oldName}`);
  xelib.SetValue(warforgedArmor, `EDID`, `PaMa_ARMO_Warforged_${namingMimic(rec)}`);
  addLinkedArrayItem(warforgedArmor, `KWDA`, locals.forgedKeyword);
  applyArmorModfiers(locals, warforgedArmor);
  addWarforgedArmorRecipe(PerMaPatch, locals, warforgedArmor, reforgedArmor, armorMaterial);
  addArmorMeltdownRecipe(PerMaPatch, locals, warforgedArmor, armorMaterial);
  addTemperingRecipe(PerMaPatch, locals, warforgedArmor, armorMaterial);
};

function addReplicaArmorRecipe(PerMaPatch, locals, rec, armorMaterial, original) {
  let materialTemper = armorMaterial.materialTemper;
  if (materialTemper !== `NONE`){
    let requiredPerk = locals.BaseMaterialsArmor[materialTemper].perk;
    let copycatPerk = locals.permaPerks.xMASMIMasteryWarforged;
    let artifactEssence = locals.permaMisc.xMASMICopycatArtifactEssence;
    let temperIngot = locals.BaseMaterialsArmor[materialTemper].temperIngot
    let benchKW = locals.skyrimKeywords.CraftingSmithingForge;
    let newRecipe = xelib.AddElement(PerMaPatch,`Constructible Object\\COBJ`);
    xelib.AddElementValue(newRecipe,`EDID`,`PaMa_ARMO_CRAFT_${namingMimic(rec)}`);
    let newItem1 = addLinkedArrayItem(newRecipe, `Items`, artifactEssence, `CNTO\\Item`);
    xelib.SetValue(newItem1, `CNTO\\Count`, '1');
    let newItem2 = addLinkedArrayItem(newRecipe, `Items`, temperIngot, `CNTO\\Item`);
    xelib.SetValue(newItem2, `CNTO\\Count`, '3');
    if (requiredPerk) {addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, requiredPerk)};
    addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, copycatPerk);
    addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, original);
    addLinkedElementValue(newRecipe, 'CNAM', rec); //Created Object
    addLinkedElementValue(newRecipe, 'BNAM', benchKW); //Workbench Keyword
    xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
  };
};

function doDaedricReplicas(PermaPatch, locals, rec, armorMaterial){
  replicaArmor = xelib.CopyElement(rec, PermaPatch, true);
  oldName = xelib.GetValue(replicaArmor, `FULL`);
  xelib.SetValue(replicaArmor, `FULL`, `${oldName} Replica`);
  xelib.SetValue(replicaArmor, `EDID`, `PaMa_ARMO_${namingMimic(replicaArmor)}`);
  applyArmorModfiers(locals, replicaArmor);
  xelib.RemoveElement(replicaArmor, `EITM`);
  xelib.RemoveElement(replicaArmor, `VMAD`);
  addReplicaArmorRecipe(PermaPatch, locals, replicaArmor, armorMaterial, rec)
  addArmorMeltdownRecipe(PermaPatch, locals, replicaArmor, armorMaterial);
  let reforgedArmor = createReforgedArmor(PermaPatch, locals, replicaArmor, armorMaterial);
  createWarforgedArmor(PermaPatch, locals, replicaArmor, reforgedArmor, armorMaterial);
};

function getLeatherArmorCOBJ(locals, rec, leatherArmorCOBJ) {
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
    };
    return true
  };
};

function ingredientsContainX(recipe, checkFor){
  let ingredients = xelib.GetElements(recipe, `Items`);
  return ingredients.some(rec => {
    if (xelib.EditorID(xelib.GetLinksTo(rec, 'CNTO\\Item')) === xelib.EditorID(checkFor)){
      return true
    };
  });
};

function addQualityLeatherRecipe(PerMaPatch, locals, rec, qualityLeatherArmor, leatherArmorCOBJ){
  let leatherPerk = locals.permaPerks.xMASMIMaterialLeather;
  let qualityLeather = locals.permaMisc.xMAWAYQualityLeather;
  let qualityLeatherStrips = locals.permaMisc.xMAWAYQualityLeatherStrips;
  let craftingRecipes = leatherArmorCOBJ.craft
  .filter(recipe =>
    xelib.EditorID(xelib.GetLinksTo(recipe, `CNAM`)) == xelib.EditorID(rec)
  );
  craftingRecipes.forEach(recipe => {
    let newRecipe = xelib.CopyElement(recipe, PerMaPatch, true);
    xelib.SetValue(newRecipe, `EDID`, `PaMa_ARMO_CRAFT_${namingMimic(qualityLeatherArmor)}`);
    xelib.RemoveElement(newRecipe, `Conditions`);
    addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, leatherPerk);
    if (xelib.HasElement(recipe, `Items`) && ingredientsContainX(newRecipe, locals.skyrimMisc.Leather01)) {
      addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, qualityLeather);
      xelib.GetElements(newRecipe, `Items`).forEach(rec => {
        if (xelib.EditorID(xelib.GetLinksTo(rec, 'CNTO\\Item')) === `Leather01`){
          xelib.SetLinksTo(rec, 'CNTO\\Item', qualityLeather);
        };
      });
    };
    if (xelib.HasElement(recipe, `Items`) && ingredientsContainX(newRecipe, locals.skyrimMisc.LeatherStrips)) {
      addLinkedCondition(newRecipe, `GetItemCount`, `1`, greaterThanEqualTo, qualityLeatherStrips);
      xelib.GetElements(newRecipe, `Items`).forEach(rec => {
        if (xelib.EditorID(xelib.GetLinksTo(rec, 'CNTO\\Item')) === `LeatherStrips`){
          xelib.SetLinksTo(rec, 'CNTO\\Item', qualityLeatherStrips);
        };
      });
    };
  });
};

function doQualityLeather(PerMaPatch, locals, rec, armorMaterial, leatherArmorCOBJ){
  qualityLeatherArmor = xelib.CopyElement(rec, PerMaPatch, true);
  oldName = xelib.GetValue(qualityLeatherArmor, `FULL`);
  xelib.SetValue(qualityLeatherArmor, `FULL`, `Quality ${oldName}`);
  xelib.SetValue(qualityLeatherArmor, `EDID`, `PaMa_ARMO_${namingMimic(qualityLeatherArmor)}`);
  applyArmorModfiers(locals, qualityLeatherArmor);
  addQualityLeatherRecipe(PerMaPatch, locals, rec, qualityLeatherArmor, leatherArmorCOBJ)
  addArmorMeltdownRecipe(PerMaPatch, locals, qualityLeatherArmor, armorMaterial);
  addTemperingRecipe(PerMaPatch, locals, qualityLeatherArmor, armorMaterial);
  let reforgedArmor = createReforgedArmor(PerMaPatch, locals, qualityLeatherArmor, armorMaterial);
  createWarforgedArmor(PerMaPatch, locals, qualityLeatherArmor, reforgedArmor, armorMaterial);
  if (GetRecordKeywordEDIDs(qualityLeatherArmor).includes(`DaedricArtifact`)){
    doDaedricReplicas(PermaPatch, locals, rec, armorMaterial);
  };
};*/

module.exports = {/*getNativeFormID,*/ /*addClothingMeltdownRecipe,*/ /*getArmorMeltdownOutput,*/
  initJSONs, /*getArmorMaterial,*/ namingMimic,
  /*doArmorKeywords,*/ initRefMaps, /*ReforgeAllowed,*/ /*addArmorMeltdownRecipe,*/
  /*setArmorValue,*/ GetRecordKeywordEDIDs, addLinkedCondition,
  addLinkedElementValue,addLinkedArrayItem, /*expensiveClothingThreshold, */
  /*ClothingKeywords,*/ /*JewelryKeywords,*/ /*applyArmorModfiers, addMasqueradeKeywords,*/
  /*createReforgedArmor, addTemperingRecipe, createWarforgedArmor,
  addReforgedArmorRecipe, addWarforgedArmorRecipe, addReplicaArmorRecipe, doDaedricReplicas,
  getLeatherArmorCOBJ, doQualityLeather,*/ initArmorPatcher
}