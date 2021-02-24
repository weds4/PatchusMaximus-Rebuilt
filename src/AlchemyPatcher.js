let Extensions = require(`./PaMaRemadeExtension.js`);
//Useful constants
let equalTo = `10000000`;
let greaterThanEqualTo = `11000000`;

//-----------------Alchemy Patcher Dictionary/Lexicon Objects------------------------
let exclusionMap = {
  NAME: 'Name',
  EDID: 'EditorID',
  CONTAINS: 'contains',
  STARTSWITH: 'startsWith',
  EQUALS: 'EQUALS'
};

//-----------------Alchemy Patcher Supporting Functions------------------------------
function isAlchAllowed(locals, rec){
  let alchExclusions = locals.alchemyJson["ns2:alchemy"].potion_exclusions.exclusion
  return alchExclusions.every(exclusion => {
    let target = xelib[exclusionMap[exclusion.target]](rec);
    let method = exclusionMap[exclusion.type];
    if(method === 'EQUALS') return target !== exclusion.text;
    return !target[method](exclusion.text);
  });
};

function makePotionWorkOverTime(locals, rec){

};

function disableAssociatedMagicSchools(locals, rec){

};

//-----------------Actual Alchemy Patcher Functions-----------------------------------
/*Every function feeds a zedit `process` block. A process block is either a `load:` and 
`patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
but I'm not sure why I'd in this patcher*/
function loadAndPatch_Alchemy(patchFile, settings, helpers, locals){
  return {
    load: {
      signature: `ALCH`,
      filter: rec => {//Called for each loaded record. Return false to skip patching a record
        locals.UseThief
        && isAlchAllowed(locals, rec);
      }
    },
    patch: function (rec) {

    }
  };
};

function records_Alchemy(patchFile, settings, helpers, locals){
  return {
    records: (filesToPatch, helpers, settings, locals) => {
      
      return [];
    }
  };
};

module.exports = {loadAndPatch_Alchemy, records_Alchemy};