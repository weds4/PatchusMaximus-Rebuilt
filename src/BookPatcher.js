module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants; //can use this instead of Extensions.constants.equalTo
  const {getRecordObject, copyRecord} = Extensions.RecordObjectFunctions; //can use this instead of Extensions.RecordObjectFunctions.getRecordObject
  
  //-----------------Book Patcher Dictionary/Lexicon Objects------------------------

  //-----------------Book Patcher Supporting Functions----------------------------------

  //-----------------Book Patcher Objects----------------------------------
  /*Every object feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  const records_Books = {
    records: (filesToPatch, helpers, settings, locals) => {
      helpers.loadRecords('BOOK')
      .filter(rec => {

      });


      return [];
    }
  };
  
  
  return {
    records_Books
  };
};