module.exports = function({xelib, Extensions, patchFile, settings, helpers, locals}){
  //Useful constants
  const {equalTo, greaterThanEqualTo, exclusionMap, stringToBoolean} = Extensions.constants;
  const {getRecordObject, copyRecord} = Extensions.RecordObjectFunctions;

  //-----------------Alchemy Patcher Supporting Functions------------------------------
  function isPotionAllowed(rec){
    let alchExclusions = locals.alchemyJson["ns2:alchemy"].potion_exclusions.exclusion
    return alchExclusions.every(exclusion => {
      let target = xelib[exclusionMap[exclusion.target]](rec);
      let method = exclusionMap[exclusion.type];
      if(method === 'EQUALS') return target !== exclusion.text;
      return !target[method](exclusion.text);
    });
  };

  function getAlchemyEffect(rec){//what perma thinks this magic effect is
    return Extensions.getObjectFromBinding(rec, locals.alchemyBindings, locals.alchemyEffect);
  };

  function getRecordArray_Effects(rec){//this gets the array of effects from the record in zedit
    let effectsData = {}
    xelib.GetElements(rec, `Effects`).forEach(e => {
      let effectName = xelib.EditorID(xelib.GetLinksTo(e, `EFID`));
      effectsData[effectName] = {
        mgefHandle: xelib.GetWinningOverride(xelib.GetLinksTo(e, `EFID`)),
        magnitude: xelib.GetValue(e, `EFIT\\Magnitude`),
        duration: xelib.GetValue(e, `EFIT\\Duration`),
        baseCost: xelib.GetValue(xelib.GetLinksTo(e, `EFID`), `Magic Effect Data\\DATA\\Base Cost`)
      };
    });
    return effectsData;
  };

  function getPotionMultiplier(rec){
    return Extensions.getObjectFromBinding(rec, locals.potionMultBindings, locals.potionMultiplier);
  };

  /*for some reason, the original patcher doesn't catch vigor and magicka recovery poisons 
    in my dev modlist (might be USSEP?), however this patcher catches them, and I feel 
    confident that this is intended behavior, so I'm calling this a bugfix*/
  function makePotionWorkOverTime(Record, disableAMSArray){
    let potionEffects = getRecordArray_Effects(Record.handle); //the effects of the potion
    Object.keys(potionEffects).forEach(EDIDkey => {
      let potionEffect = potionEffects[EDIDkey]; //this is an object containing the mgef hande, duration, magnitude, and cost of an effect on a potion
      let alchemyEffect = getAlchemyEffect(potionEffect.mgefHandle);//what perma thinks the effect is
      if (alchemyEffect !== null) {
        let oldMag = potionEffect.magnitude;
        let oldDur = potionEffect.duration;
        let oldCost = potionEffect.baseCost;
        let potionMultiplier = getPotionMultiplier(Record.handle);
        if (potionMultiplier !== null && alchemyEffect !== null){
          let newMag = alchemyEffect.baseMagnitude;
          let newDur = Math.round(alchemyEffect.baseDuration);
          if (stringToBoolean[alchemyEffect.allowPotionMultiplier]){
            newMag *= potionMultiplier.multiplierMagnitude;
            newDur = Math.round(alchemyEffect.baseDuration*potionMultiplier.multiplierDuration);
          }
          let newCost = alchemyEffect.baseCost;
          if (oldMag !== newMag && newMag >= 0) {
            if (!Record.isCopy){copyRecord(Record);}
            let recordHandleEffectArrayItem = xelib.GetArrayItem(Record.handle, `Effects`, `EFID`, xelib.LongName(potionEffect.mgefHandle));
            xelib.SetValue(recordHandleEffectArrayItem, `EFIT\\Magnitude`, newMag.toString())
          }
          if (oldDur !== newDur && newDur >= 0) {
            if (!Record.isCopy){copyRecord(Record);}
            let recordHandleEffectArrayItem = xelib.GetArrayItem(Record.handle, `Effects`, `EFID`, xelib.LongName(potionEffect.mgefHandle));
            xelib.SetValue(recordHandleEffectArrayItem, `EFIT\\Duration`,  newDur.toString());
          }
          if (oldCost !== newCost && newCost >= 0) {
            disableAMSArray.push({
              handle: potionEffect.mgefHandle,
              cost: newCost
            });
          }
        }
      }
    });
  }

  function disableAssociatedMagicSchools(rec){
    let potionEffects = getRecordArray_Effects(rec); //the effects of the potion
    Object.keys(potionEffects).forEach(EDIDkey => {
      let Record = getRecordObject(potionEffects[EDIDkey].mgefHandle);
      if (xelib.GetValue(Record.handle, `Magic Effect Data\\DATA\\Magic Skill`) !== `None`) {
        if (!Record.isCopy){copyRecord(Record);}
        xelib.SetValue(Record.handle, `Magic Effect Data\\DATA\\Magic Skill`, `None`);
      };
    });
  };

  function isIngrAllowed(rec){
    let ingrExclusions = locals.alchemyJson["ns2:alchemy"].ingredient_exclusions.exclusion
    return ingrExclusions.every(exclusion => {
      let target = xelib[exclusionMap[exclusion.target]](rec);
      let method = exclusionMap[exclusion.type];
      if(method === 'EQUALS') return target !== exclusion.text;
      return !target[method](exclusion.text);
    });
  };

  function getIngrMultiplier(rec){
    return Extensions.getObjectFromBinding(rec, locals.ingrVarBindings, locals.ingrVariation);
  };

  function makeIngrWorkOverTime(Record){
    let ingrEffects = getRecordArray_Effects(Record.handle); //the effects of the ingredient
    Object.keys(ingrEffects).forEach(EDIDkey => {
      let ingrEffect = ingrEffects[EDIDkey]; //this is an object containing the mgef hande, duration, magnitude, and cost of an effect on a ingredient
      //let mgefOverride = xelib.CopyElement(ingrEffect.mgefHandle, patchFile);
      //xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Magic Skill`, `None`);//this is the more sensible place to do this, since we are already patching this record
      let alchemyEffect = getAlchemyEffect(ingrEffect.mgefHandle);
      if (alchemyEffect !== null) {
        let oldMag = ingrEffect.magnitude;
        let oldDur = ingrEffect.duration;
        let ingrMultiplier = getIngrMultiplier(Record.handle);
        if (ingrMultiplier !== null && alchemyEffect !== null){
          let newMag = alchemyEffect.baseMagnitude;
          let newDur = Math.round(alchemyEffect.baseDuration);
          if (stringToBoolean[alchemyEffect.allowPotionMultiplier]){
            newMag *= ingrMultiplier.multiplierMagnitude;
            newDur = Math.round(alchemyEffect.baseDuration*ingrMultiplier.multiplierDuration);
          }
          if (oldMag !== newMag && newMag >= 0) {
            if (!Record.isCopy){copyRecord(Record);}
            let recordHandleEffectArrayItem = xelib.GetArrayItem(Record.handle, `Effects`, `EFID`, xelib.LongName(ingrEffect.mgefHandle));
            xelib.SetValue(recordHandleEffectArrayItem, `EFIT\\Magnitude`, newMag.toString())
          }
          if (oldDur !== newDur && newDur >= 0) {
            if (!Record.isCopy){copyRecord(Record);}
            let recordHandleEffectArrayItem = xelib.GetArrayItem(Record.handle, `Effects`, `EFID`, xelib.LongName(ingrEffect.mgefHandle));
            xelib.SetValue(recordHandleEffectArrayItem, `EFIT\\Duration`,  newDur.toString());
          }
        }
      }/*
      let oldMag = ingrEffect.magnitude;
      let oldDur = ingrEffect.duration;
      let ingrMultiplier = getIngrMultiplier(rec);
      let recEffectArrayItem = xelib.GetArrayItem(rec, `Effects`, `EFID`, xelib.LongName(ingrEffect.mgefHandle));
      if (ingrMultiplier !== null && alchemyEffect !== null){
        let newMag = alchemyEffect.baseMagnitude;
        let newDur = Math.round(alchemyEffect.baseDuration);
        if (stringToBoolean[alchemyEffect.allowIngredientVariation]){
          newMag *= ingrMultiplier.multiplierMagnitude;
          newDur = Math.round(alchemyEffect.baseDuration*ingrMultiplier.multiplierDuration);
        };
        if (oldMag !== newMag && newMag >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Magnitude`, newMag.toString())
        };
        if (oldDur !== newDur && newDur >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Duration`,  newDur.toString());
        }; 
      };*/
    });
  };

  //-----------------Actual Alchemy Patcher Functions-----------------------------------
  /*Every function feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  const records_Alchemy = {
    records: (filesToPatch, helpers, settings, locals) => {
      helpers.logMessage(`Patching alchemical magic effects`);
      helpers.loadRecords('ALCH')
      .filter(rec => xelib.HasElement(rec, `Effects`))
      .forEach(rec => {
        disableAssociatedMagicSchools(rec);
      });

      helpers.loadRecords('ARMO')
      .filter(rec => xelib.HasElement(rec, `Effects`))
      .forEach(rec => {
        disableAssociatedMagicSchools(rec);
      });
      helpers.logMessage(`Done patching alchemical magic effects`);
      return [];
    }
  };

  const records_Ingestible = {
    records: (filesToPatch, helpers, settings, locals) => {
      if (settings.UseThief) {
        helpers.logMessage(`Loading ingestibles`);
        let disableAMSArray = [];
        let ingests = helpers.loadRecords('ALCH')
        .filter(rec => {
          let potionEffects = getRecordArray_Effects(rec);
          return xelib.HasElement(rec, `Effects`)
          && isPotionAllowed(rec) 
          && !Object.keys(potionEffects).every(effect => {// skip if every alch effect is undetermined
            if (getAlchemyEffect(potionEffects[effect].mgefHandle) === null){return true;}
          });
        });
        helpers.logMessage(`Patching ingestibles`);
        ingests.forEach(rec => {
          let Record = getRecordObject(rec);
          makePotionWorkOverTime(Record, disableAMSArray)
        });
        disableAMSArray.forEach(effect => {
          let Record = getRecordObject(effect.handle);
          if (!Record.isCopy){copyRecord(Record);}
          xelib.SetValue(Record.handle, `Magic Effect Data\\DATA\\Base Cost`, effect.cost.toString());
          let description = xelib.GetValue(Record.handle, `DNAM`);
          if (!description.contains(`<dur>`)){
            xelib.SetValue(Record.handle, `DNAM`, `${description} [Duration: <dur> seconds]`);
            xelib.SetFlag(Record.handle, `Magic Effect Data\\DATA\\Flags`, `No Duration`, false);
          }
        });
        helpers.logMessage(`Done patching ingestibles`);
      }
      return [];
    }
  };

  const records_Ingredients = {
    records: (filesToPatch, helpers, settings, locals) => {
      if (settings.UseThief) {
        helpers.logMessage(`Loading Ingredients`);
        let disableAMSArray = [];
        let ingredients = helpers.loadRecords('INGR')
        .filter(rec => {
          let ingrEffects = getRecordArray_Effects(rec);
          return xelib.HasElement(rec, `Effects`)
          && isIngrAllowed(rec) 
          && !Object.keys(ingrEffects).every(effect => {// skip if every alch effect is undetermined
            if (getAlchemyEffect(ingrEffects[effect].mgefHandle) === null){return true;}
          });
        });
        helpers.logMessage(`Patching Ingredients`);
        ingredients.forEach(rec => {
          let Record = getRecordObject(rec);
          makeIngrWorkOverTime(Record);
        });
        disableAMSArray.forEach(effect => {
          let Record = getRecordObject(effect.handle);
          if (!Record.isCopy){copyRecord(Record);}
          xelib.SetValue(Record.handle, `Magic Effect Data\\DATA\\Base Cost`, effect.cost.toString());
          let description = xelib.GetValue(Record.handle, `DNAM`);
          if (!description.contains(`<dur>`)){
            xelib.SetValue(Record.handle, `DNAM`, `${description} [Duration: <dur> seconds]`);
            xelib.SetFlag(Record.handle, `Magic Effect Data\\DATA\\Flags`, `No Duration`, false);
          };
        });
        helpers.logMessage(`Done patching Ingredients`);
      }
      return [];
    }
  };

  return {
		records_Alchemy,
    records_Ingestible,
    records_Ingredients
  };
}