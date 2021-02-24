let Extensions = require(`./PaMaRemadeExtension.js`);
//Useful constants
let equalTo = `10000000`;
let greaterThanEqualTo = `11000000`;

//-----------------Alchemy Patcher Dictionary/Lexicon Objects------------------------


//-----------------Alchemy Patcher Supporting Functions------------------------------


//-----------------Actual Alchemy Patcher Functions-----------------------------------
/*Every function feeds a zedit `process` block. A process block is either a `load:` and 
`patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
but I'm not sure why I'd in this patcher*/
function loadAndPatch_Alchemy(patchFile, settings, helpers, locals){
  return {
    load: {
      signature: `ALCH`,
      filter: record => {//Called for each loaded record. Return false to skip patching a record
        
      }
    },
    patch: function (record) {
   
    }
  };
};

function records_Alchemy(patchFile, settings, helpers, locals){
  return {
    records: (filesToPatch, helpers, settings, locals) => {
      
    }
  };
};

module.exports = {loadAndPatch_Alchemy, records_Alchemy};