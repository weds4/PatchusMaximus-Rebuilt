module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants; //can use this instead of Extensions.constants.equalTo
  const {getRecordObject, copyRecord} = Extensions.RecordObjectFunctions; //can use this instead of Extensions.RecordObjectFunctions.getRecordObject
  
  //-----------------Book Patcher Dictionary/Lexicon Objects------------------------
  let rules = {
    staff: locals.enchantingJson[`ns2:enchanting`].staff_crafting_exclusions.exclusion,
    scroll: locals.enchantingJson[`ns2:enchanting`].scroll_crafting_exclusions.exclusion,
    distSpell: locals.leveledListsJson[`ns2:leveledLists`].distribution_exclusions_spell.exclusion,
    distBook: locals.leveledListsJson[`ns2:leveledLists`].distribution_exclusions_book.exclusion
  };
  //-----------------Book Patcher Supporting Functions----------------------------------
  function exclusionFinder(rec, ruleSet) {
    return rules[ruleSet].every(rule => {
      let target = xelib[exclusionMap[rule.target]](rec);
      let method = exclusionMap[rule.type];
      if(method === 'EQUALS') return target !== rule.text;
      return !target[method](rule.text);
    });
  }

  function staffAllowed(rec, booksReference) {
    if (exclusionFinder(rec, `staff`)) {
      booksReference[rec].staff = true;
      return true;
    }
  }

  function scrollAllowed(rec) {
    if (exclusionFinder(rec, `scroll`)) {
      booksReference[rec].scroll = true;
      return true;
    }
  }

  function distributionAllowed(rec) {
    let returnVal = false;
    if (exclusionFinder(rec, `distSpell`)) {
      booksReference[rec].distSpell = true;
      returnVal = true;
    }
    if (exclusionFinder(rec, `distBook`)) {
      booksReference[rec].distBook = true;
      returnVal = true;
    }
    return returnVal;
  }


  //-----------------Book Patcher Objects----------------------------------
  /*Every object feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  const records_Books = {
    records: (filesToPatch, helpers, settings, locals) => {
      let booksReference = {};
      let spellTomes = helpers.loadRecords('BOOK')
      .filter(rec => 
        xelib.GetFlag(rec, `DATA\\Flags`, `Teaches Spell`)
        && (staffAllowed(rec, booksReference)
        || scrollAllowed(rec, booksReference)
        || distributionAllowed(rec, booksReference))
      );
      
      spellTomes.forEach(rec => {
        console.log(xelib.Name(rec));

      });


      return [];
    }
  };
  
  
  return {
    records_Books
  };
};