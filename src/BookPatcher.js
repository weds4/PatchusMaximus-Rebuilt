module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants; //can use this instead of Extensions.constants.equalTo
  const {getRecordObject, copyRecord} = Extensions.RecordObjectFunctions; //can use this instead of Extensions.RecordObjectFunctions.getRecordObject
  
  //-----------------Book Patcher Dictionary/Lexicon Objects------------------------
  let rules = {};
  let emptyStaffIndex = {
    Alteration: "StaffTemplateAlteration",
    Conjuration: "StaffTemplateConjuration",
    Destruction: "StaffTemplateDestruction",
    Illusion: "StaffTemplateIIllusion",
    Restoration: "StaffTemplateRestoration"
  };
  let skillLevelPerks = {
    '0': "perkEnchantingBasicScripture",
    '25': "perkEnchantingBasicScripture",
    '50': "perkEnchantingAdvancedScripture",
    '75': "perkEnchantingElaborateScripture",
    '100': "perkEnchantingSagesScripture"
  };
  //-----------------Book Patcher Supporting Functions----------------------------------
  function loadBookRules() {
    rules = {
      staff: locals.enchantingJson[`ns2:enchanting`].staff_crafting_exclusions.exclusion,
      scroll: locals.enchantingJson[`ns2:enchanting`].scroll_crafting_exclusions.exclusion,
      distSpell: locals.leveledListsJson[`ns2:leveledLists`].distribution_exclusions_spell_tome.distribution_exclusions_spell.exclusion,
      distBook: locals.leveledListsJson[`ns2:leveledLists`].distribution_exclusions_spell_tome.distribution_exclusions_book.exclusion
    }
  }
  
  function inclusionAllowed(rec, ruleSet) {
    return rules[ruleSet].every(rule => {
      let target = xelib[exclusionMap[rule.target]](rec);
      let method = exclusionMap[rule.type];
      if(method === 'EQUALS') return target !== rule.text;
      return !target[method](rule.text);
    });
  }

  function getTaughtSpell(rec){
    return xelib.GetLinksTo(rec, `DATA\\Teaches`);
  }

  function getSpellData(rec){
    return {
      school: Extensions.getSchool(rec),
      castType: xelib.GetValue(rec, `SPIT\\Cast Type`),
      targetType: xelib.GetValue(rec, `SPIT\\Target Type`),
      equipType: xelib.GetValue(rec, `ETYP`),
      chargeTime: xelib.GetValue(rec, `SPIT\\Charge Time`),
      castDur: xelib.GetValue(rec, `SPIT\\Cast Duration`),
      type: xelib.GetValue(rec, `SPIT\\Type`)
    };
  }

  function addMagicEffects(spell, newRec) {
    xelib.RemoveArrayItem(newRec, `Effects`, `EFID`, `NULL - Null Reference [00000000]`);
    let spellEffects = xelib.GetElements(spell, `Effects`);
    let enchEffects = xelib.GetElement(newRec, `Effects`);
    spellEffects.forEach(e => {
      xelib.CopyElement(e, enchEffects);
    });
    return newRec;
  }
  
  function getScrollCraftingPerk(spell) {
    let mgefs = xelib.GetElements(spell, `Effects`);
    let maxLvl = null;
    mgefs.forEach(handle => {
      mgef = xelib.GetLinksTo(handle, `EFID`);
      let level = parseInt(xelib.GetValue(mgef, `Magic Effect Data\\DATA\\Minimum Skill Level`));
      if (level >= maxLvl) {
        maxLvl = level;
      };
    });
    return skillLevelPerks[maxLvl];
  }

  function generateStaff(book, spell) {//read only function
    let {school, castType, targetType, equipType} = getSpellData(spell);
    if ((school !== null) && (castType !== `Constant Effect`) && (targetType !== `Self`) && (equipType !== `BothHands [EQUP:00013F45]`)) {
      //console.log(`Generating staff for ${xelib.LongName(spell)}, school is ${school}, template is ${emptyStaffIndex[school]}`);
      //make new enchantment
      let newEnch = xelib.CopyElement(locals.permaObjEffects.xMAEmptyStaffEnch, patchFile, true);
      xelib.AddElementValue(newEnch, `EDID`, `PaMa_ENCH_${Extensions.namingMimic(spell)}`);
      xelib.AddElementValue(newEnch, `ENIT\\Cast Type`, castType);
      xelib.AddElementValue(newEnch, `ENIT\\Target Type`, targetType);
      xelib.AddElementValue(newEnch, `FULL`, `ENCH_${xelib.Name(spell)}`)
      let newCost = Math.min(100, Math.max(xelib.GetValue(spell, `SPIT\\Base Cost`), 50));
      xelib.AddElementValue(newEnch, `ENIT\\Enchantment Cost`, newCost.toString());
      newEnch = addMagicEffects(spell, newEnch);
      //done with new ench, now make staff
      let newStaff = xelib.CopyElement(locals.skyrimWeapons[emptyStaffIndex[school]], patchFile, true);
      xelib.AddElementValue(newStaff, `EDID`, `PaMa_STAFF_${Extensions.namingMimic(spell)}`);
      xelib.AddElementValue(newStaff, `FULL`, `Staff [${xelib.Name(spell)}]`);
      xelib.AddElementValue(newStaff, `DATA\\Value`, `500`);
      xelib.AddElementValue(newStaff, `EAMT`, `2500`);
      Extensions.addLinkedElementValue(newStaff, `EITM`, newEnch); //add new enchantment to staff
      let newRecipe = xelib.AddElement(patchFile, `Constructible Object\\COBJ`);
      xelib.AddElementValue(newRecipe, `EDID`, `PaMa_CRAFT_STAFF_${xelib.Name(spell)}`);
      Extensions.addLinkedElementValue(newRecipe, 'BNAM', locals.dragonbornKeywords.DLC2StaffEnchanter);
      Extensions.addLinkedCondition(newRecipe, `HasPerk`, `1`, equalTo, locals.permaPerks.xMAENCStaffaire);
      Extensions.addLinkedCondition(newRecipe, `HasSpell`, `1`, equalTo, spell);
      let newItem1 = Extensions.addLinkedArrayItem(newRecipe, `Items`, book, `CNTO\\Item`);
      xelib.SetValue(newItem1, `CNTO\\Count`, '1');
      let newItem2 = Extensions.addLinkedArrayItem(newRecipe, `Items`, locals.skyrimWeapons[emptyStaffIndex[school]], `CNTO\\Item`);
      xelib.SetValue(newItem2, `CNTO\\Count`, '1');
      Extensions.addLinkedElementValue(newRecipe, 'CNAM', newStaff); //Created Object
      xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
    }
  }

  function generateScroll(rec, spell){//read only function
    let {castType, targetType, equipType, chargeTime, castDur, type} = getSpellData(spell);
    let craftingPerk = getScrollCraftingPerk(spell);
    if ((castType !== `Concentration`) && craftingPerk) {//setting it up like this deviates from the original, but prevents unused records from being generated. Technically should be if (!concentration){make scroll} else if (craftingPerk){make crafting recipe}
      let newScroll = xelib.CopyElement(locals.permaScrolls.xMAScrollEmpty, patchFile, true);
      xelib.AddElementValue(newScroll, `EDID`, `PaMa_SCRO_${Extensions.namingMimic(spell)}`);
      xelib.AddElementValue(newScroll, `SPIT\\Cast Duration`, castDur);//cast duration
      xelib.AddElementValue(newScroll, `SPIT\\Cast Type`, castType);
      xelib.AddElementValue(newScroll, `SPIT\\Charge Time`, chargeTime);//charge time
      xelib.AddElementValue(newScroll, `SPIT\\Target Type`, targetType);
      xelib.AddElementValue(newScroll, `ETYP`, equipType);//equip slot
      xelib.AddElementValue(newScroll, `SPIT\\Type`, type);//spell, ability, power, etc.
      xelib.AddElementValue(newScroll, `FULL`, `${xelib.Name(spell)} [Scroll]`);
      newScroll = addMagicEffects(spell, newScroll);
    }
  }
  /*
  function checkDistribute(rec, booksReference) {//gotta check book and spell
    if (inclusionAllowed(rec, `distSpell`)) {
      booksReference.distSpell.push(rec);
    }
    if (inclusionAllowed(rec, `distBook`)) {
      booksReference.distBook.push(rec);
    }*/

  //-----------------Book Patcher Objects----------------------------------
  /*Every object feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  const records_Books = {
    records: (filesToPatch, helpers, settings, locals) => {
      let books = helpers.loadRecords('BOOK')
      .filter(rec => 
        xelib.GetFlag(rec, `DATA\\Flags`, `Teaches Spell`)
      );
      console.log(books.length);
      let patchedSpells = {};
      books
      .forEach(rec => {
        let spell = getTaughtSpell(rec);
        if (!patchedSpells.hasOwnProperty(xelib.EditorID(spell))){
          if (inclusionAllowed(rec, `staff`) && inclusionAllowed(spell, `staff`)) {
            generateStaff(rec, spell);
            patchedSpells[xelib.EditorID(spell)] = true;
          }
          if (inclusionAllowed(rec, `scroll`) && inclusionAllowed(spell, `scroll`)) {
            generateScroll(rec ,spell);
            patchedSpells[xelib.EditorID(spell)] = true;
          }
        }
      });

      return [];
    }
  };
  
  
  return {
    loadBookRules,
    records_Books
  };
};