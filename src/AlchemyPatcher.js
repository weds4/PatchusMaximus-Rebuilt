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

function getAlchMgefEDIDs(rec){
  let effects = [];
  xelib.GetElements(rec, `Effects\\EFID`).forEach(e => {
    let ref = xelib.GetLinksTo(e);
    if (ref) effects.push(xelib.EditorID(ref));
  });
  return effects;
};

function getAlchDur(rec){
  let durations = {};
  exlib.GetElements(rec, `Effects`).forEach(e =>{
    duration[`${xelib.EditorID(xelib.GetLinksTo(e, `EFID`))}`] = 
      xelib.GetValue(e, `EFIT\\Duration`);
  });
};

function getAlchMag(rec){
  let magnitudes = {};
  exlib.GetElements(rec, `Effects`).forEach(e =>{
    magnitudes[xelib.EditorID(xelib.GetLinksTo(e, `EFID`))] = 
      xelib.GetValue(e, `EFIT\\Magnitude`);
  });
};

function getAlchData(rec){
  let effectsData = {}
  xelib.GetElements(rec, `Effects`).forEach(e => {
    let effectName = xelib.EditorID(xelib.GetLinksTo(e));
    effectsData[effectName].mgefHandle = 
      xelib.GetLinksTo(e, `EFID`);
    effectsData[effectName].magnitude = 
      xelib.GetValue(e, `EFIT\\Magnitude`);
    effectsData[effectName].duration = 
      xelib.GetValue(e, `EFIT\\Magnitude`);
  });
  return effectsData;
};

function makePotionWorkOverTime(locals, rec){
  let effects = getAlchData(rec)
  Object.keys(effects).forEach(effectName => {
    let effect = effects.effectName
    
  });
};

function disableAssociatedMagicSchools(locals, rec){

};

//-----------------Actual Alchemy Patcher Functions-----------------------------------
/*Every function feeds a zedit `process` block. A process block is either a `load:` and 
`patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
but I'm not sure why I'd need one in this patcher*/
function loadAndPatch_Alchemy(patchFile, settings, helpers, locals){
  return {
    load: {
      signature: `ALCH`,
      filter: rec => {//Called for each loaded record. Return false to skip patching a record
        locals.UseThief
        && xelib.HasElement(rec, `Effects`)
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