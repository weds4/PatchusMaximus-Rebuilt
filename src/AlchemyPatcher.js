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

function getAlchData(rec){
  let effectsData = {}
  xelib.GetElements(rec, `Effects`).forEach(e => {
    let effectName = xelib.EditorID(xelib.GetLinksTo(e, `EFID`));
    effectsData[effectName] = {
      mgefHandle: xelib.GetLinksTo(e, `EFID`),
      magnitude: xelib.GetValue(e, `EFIT\\Magnitude`),
      duration: xelib.GetValue(e, `EFIT\\Duration`),
      baseCost: xelib.GetValue(xelib.GetLinksTo(e, `EFID`), `Magic Effect Data\\DATA\\Base Cost`)
    };
  });
  return effectsData;
};

function getAlchemyEffect(locals, rec){
  let effectName = xelib.GetValue(rec, `FULL`);
  let alchemyEffectBindingObject = locals.alchemyJson["ns2:alchemy"].alchemy_effect_bindings.binding
  let maxHitSize = 0;
  let bestHit = null;
  let currentHitSize = 0;
  let currentHit = null;
  alchemyEffectBindingObject.forEach(binding =>  {
    if (effectName.includes(binding.substring)) {
      currentHit = binding.identifier;
      currentHitSize = binding.substring.length
      if (currentHitSize> maxHitSize){
        maxHitSize = currentHitSize;
        bestHit = currentHit;
      };
    };
  });
  let alchemyEffectObject = locals.alchemyJson["ns2:alchemy"].alchemy_effects.alchemy_effect;
  let alchemyEffect = null
  alchemyEffectObject.forEach(effect => {
    if (bestHit === effect.identifier){         
      alchemyEffect = effect;
    };
  });
  return alchemyEffect;
};

function makePotionWorkOverTime(locals, rec){
  let potionEffects = getAlchData(rec); //the effects of the potion
  Object.keys(potionEffects).forEach(EDIDkey => {
    let potionEffect = potionEffects[EDIDkey]; //this is an object containing the mgef hande, duration, magnitude, and cost of an effect on a potion
    let alchemyEffect = getAlchemyEffect(locals, potionEffect.mgefHandle); //what perma thinks the effect is
    let oldDur = potionEffect.duration;
    let oldMag = potionEffect.magnitude;
    let oldCost = potionEffect.baseCost;
    
    
    
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
        return locals.UseThief
        && xelib.HasElement(rec, `Effects`)
        && isAlchAllowed(locals, rec);
      }
    },
    patch: function (rec) {
      makePotionWorkOverTime(locals, rec);
      //xelib.AddElementValue(rec, `FULL`, 'Nothing');
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