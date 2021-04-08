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
  }
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
/*
  function checkStaff(rec, booksReference) {
    if (inclusionAllowed(rec, `staff`)) {
      booksReference.staff.push(rec);
    }
  }

  function checkScroll(rec, booksReference) {
    if (inclusionAllowed(rec, `scroll`)) {
      booksReference.scroll.push(rec);
    }
  }

  function checkDistribute(rec, booksReference) {
    if (inclusionAllowed(rec, `distSpell`)) {
      booksReference.distSpell.push(rec);
    }
    if (inclusionAllowed(rec, `distBook`)) {
      booksReference.distBook.push(rec);
    }
  }*/

  function getTaughtSpell(rec){
    return xelib.GetLinksTo(rec, `DATA\\Teaches`);
  }

  function getSpellData(rec){
    return {
      school: Extensions.getSchool(rec),
      castType: xelib.GetValue(rec, `SPIT\\Cast Type`),
      targetType: xelib.GetValue(rec, `SPIT\\Target Type`),
      equipType: xelib.GetValue(rec, `ETYP`)
    };
  }

  function addMagicEffects(spell, newEnch) {
    xelib.RemoveArrayItem(newEnch, `Effects`, `EFID`, `NULL - Null Reference [00000000]`);
    let spellEffects = xelib.GetElements(spell, `Effects`);
    let enchEffects = xelib.GetElement(newEnch, `Effects`);
    spellEffects.forEach(e => {
      xelib.CopyElement(e, enchEffects);
    });
    return newEnch;
  }

  function BgenerateStaff(spell) {//read only function
    let {school, castType, targetType, equipType} = getSpellData(spell);
    if ((school !== null) && (castType !== `Constant Effect`) && (targetType !== `Self`) && (equipType !== `BothHands [EQUP:00013F45]`)) {
      console.log(`Generating staff for ${xelib.LongName(spell)}, school is ${school}, template is ${emptyStaffIndex[school]}`);
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
      Extensions.addLinkedElementValue(newRecipe, 'CNAM', newStaff); //Created Object
      xelib.AddElementValue(newRecipe, `NAM1`, `1`); //Created Object Count
    }
  }

  function BgenerateScroll(spell){//read only function

  }

  //-----------------Book Patcher Objects----------------------------------
  /*Every object feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  const records_Books = {
    records: (filesToPatch, helpers, settings, locals) => {
      /* //A-method
      let booksReference = {staff: [], scroll: [], distBook: [], distSpell: []};
      helpers.loadRecords('BOOK')
      .filter(rec => 
        xelib.GetFlag(rec, `DATA\\Flags`, `Teaches Spell`)
      )
      .forEach(rec => {
        checkStaff(rec, booksReference);
        checkStaff(getTaughtSpell(rec), booksReference);
        checkScroll(rec, booksReference);
        checkScroll(getTaughtSpell(rec), booksReference);
        checkDistribute(rec, booksReference)
        checkDistribute(getTaughtSpell(rec), booksReference)
      });
      
      booksReference.staff.forEach(rec => {
        console.log(`staff: ${xelib.Name(rec)}`);

      });
      booksReference.scroll.forEach(rec => {
        console.log(`scroll: ${xelib.Name(rec)}`);

      });
      booksReference.distBook.forEach(rec => {
        console.log(`distBook: ${xelib.Name(rec)}`);

      });
      booksReference.distSpell.forEach(rec => {
        console.log(`distSpell: ${xelib.Name(rec)}`);

      });*/
      //B-method
      let books = helpers.loadRecords('BOOK')
      .filter(rec => 
        xelib.GetFlag(rec, `DATA\\Flags`, `Teaches Spell`)
      );
      console.log(books.length);
      let patchedSpells = [];
      books
      .forEach(rec => {
        let spell = getTaughtSpell(rec);
        if (!patchedSpells.includes(xelib.EditorID(spell))){
          if (inclusionAllowed(rec, `staff`) && inclusionAllowed(spell, `staff`)) {
            BgenerateStaff(spell);
            patchedSpells.push(xelib.EditorID(spell));
          }
          if (inclusionAllowed(rec, `scroll`) && inclusionAllowed(spell, `scroll`)) {
            BgenerateScroll(spell);
            patchedSpells.push(xelib.EditorID(spell));
          }
        }
        //testing
      });

      return [];
    }
  };
  
  
  return {
    loadBookRules,
    records_Books
  };
};