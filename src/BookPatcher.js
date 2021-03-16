module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants; //can use this instead of Extensions.constants.equalTo
  const {getRecordObject, copyRecord} = Extensions.RecordObjectFunctions; //can use this instead of Extensions.RecordObjectFunctions.getRecordObject
  
  //-----------------Book Patcher Dictionary/Lexicon Objects------------------------
  let rules = {};
  
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
  }

  function getTaughtSpell(rec){
    return xelib.GetLinksTo(rec, `DATA\\Teaches`);
  }

  //-----------------Book Patcher Objects----------------------------------
  /*Every object feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  const records_Books = {
    records: (filesToPatch, helpers, settings, locals) => {
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

      });


      return [];
    }
  };
  
  
  return {
    loadBookRules,
    records_Books
  };
};