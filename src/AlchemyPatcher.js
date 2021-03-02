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
  function makePotionWorkOverTime(rec){
    let potionEffects = getRecordArray_Effects(rec); //the effects of the potion
    Object.keys(potionEffects).forEach(EDIDkey => {
      let potionEffect = potionEffects[EDIDkey]; //this is an object containing the mgef hande, duration, magnitude, and cost of an effect on a potion
      let mgefOverride = xelib.CopyElement(potionEffect.mgefHandle, patchFile);
      //xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Magic Skill`, `None`);//this is the more sensible place to do this, since we are already patching this record
      let alchemyEffect = getAlchemyEffect(potionEffect.mgefHandle);//what perma thinks the effect is
      let oldMag = potionEffect.magnitude;
      let oldDur = potionEffect.duration;
      let oldCost = potionEffect.baseCost;
      let potionMultiplier = getPotionMultiplier(rec);
      let recEffectArrayItem = xelib.GetArrayItem(rec, `Effects`, `EFID`, xelib.LongName(potionEffect.mgefHandle));
      if (potionMultiplier !== null && alchemyEffect !== null){
        let newMag = alchemyEffect.baseMagnitude;
        let newDur = Math.round(alchemyEffect.baseDuration);
        if (stringToBoolean[alchemyEffect.allowPotionMultiplier]){
          newMag *= potionMultiplier.multiplierMagnitude;
          newDur = Math.round(alchemyEffect.baseDuration*potionMultiplier.multiplierDuration);
        };
        let newCost = alchemyEffect.baseCost;
        if (oldMag !== newMag && newMag >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Magnitude`, newMag.toString())
        };
        if (oldDur !== newDur && newDur >= 0) {
          xelib.SetValue(recEffectArrayItem, `EFIT\\Duration`,  newDur.toString());
        };
        if (oldCost !== newCost && newCost >= 0) {
          xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Base Cost`, newCost.toString());
          let description = xelib.GetValue(mgefOverride, `DNAM`);
          if (!description.contains(`<dur>`)){
            xelib.SetValue(mgefOverride, `DNAM`, `${description} [Duration: <dur> seconds]`);
            xelib.SetFlag(mgefOverride, `Magic Effect Data\\DATA\\Flags`, `No Duration`, false);
          };
        }; 
      };
    });
  };

  function disableAssociatedMagicSchools(rec){
    let potionEffects = getRecordArray_Effects(rec); //the effects of the potion
    Object.keys(potionEffects).forEach(EDIDkey => {
      let mgef =  potionEffects[EDIDkey].mgefHandle;
      if (xelib.GetValue(mgef, `Magic Effect Data\\DATA\\Magic Skill`) !== `None`) {
        let mgefOverride = xelib.CopyElement(mgef, patchFile);
        xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Magic Skill`, `None`);
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

  function makeIngrWorkOverTime(rec){
    let ingrEffects = getRecordArray_Effects(rec); //the effects of the ingredient
    Object.keys(ingrEffects).forEach(EDIDkey => {
      let ingrEffect = ingrEffects[EDIDkey]; //this is an object containing the mgef hande, duration, magnitude, and cost of an effect on a ingredient
      //let mgefOverride = xelib.CopyElement(ingrEffect.mgefHandle, patchFile);
      //xelib.SetValue(mgefOverride, `Magic Effect Data\\DATA\\Magic Skill`, `None`);//this is the more sensible place to do this, since we are already patching this record
      let alchemyEffect = getAlchemyEffect(ingrEffect.mgefHandle);
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
      };
    });
  };

  //-----------------Actual Alchemy Patcher Functions-----------------------------------
  /*Every function feeds a zedit `process` block. A process block is either a `load:` and 
  `patch` object, or a `records:` object. You can also do a `records:` and `patch:` object,
  but I'm not sure why I'd need one in this patcher*/
  function loadAndPatch_Ingestible(patchFile, settings, helpers, locals){
    return {
      load: {
        signature: `ALCH`,
        filter: rec => {//Called for each loaded record. Return false to skip patching a record
          let potionEffects = getRecordArray_Effects(rec)
          return xelib.HasElement(rec, `Effects`)
          && isPotionAllowed(rec) 
          && Object.keys(potionEffects).every(effect => {
            if (getAlchemyEffect(potionEffects[effect].mgefHandle)!== null){return true};
          });
        }
      },
      patch: function (rec) {
        if (settings.UseThief) {
          let potionEffects = getRecordArray_Effects(rec);
          let needToDisableAMS = true
          if (isPotionAllowed(rec) 
            && Object.keys(potionEffects).some(effect => {
              if (getAlchemyEffect(potionEffects[effect].mgefHandle)!== null){return true};
            })
          ){
            makePotionWorkOverTime(rec);
            needToDisableAMS = false
          };
          if (needToDisableAMS) {//this catches any mgefs that didn't get done in makePotionWorkOverTime
            //disableAssociatedMagicSchools(rec);
          };
          makePotionWorkOverTime(rec);
        };
      }
    };
  };

  function loadAndPatch_Ingredients(patchFile, settings, helpers, locals){
    return {
      load: {
        signature: `INGR`,
        filter: rec => {//Called for each loaded record. Return false to skip patching a record
          let ingrEffects = getRecordArray_Effects(rec)
          return xelib.HasElement(rec, `Effects`)
          && isIngrAllowed(rec) 
          && Object.keys(ingrEffects).some(effect => {
              if (getAlchemyEffect(ingrEffects[effect].mgefHandle)!== null){return true};
          })
        }
      },
      patch: function (rec) {
        if (settings.UseThief) {
          /*let ingrEffects = getRecordArray_Effects(rec);
          let needToDisableAMS = true
          if (isIngrAllowed(rec) 
            && Object.keys(ingrEffects).some(effect => {
              if (getAlchemyEffect(ingrEffects[effect].mgefHandle)!== null){return true};
            })
          ){
            makeIngrWorkOverTime(rec);
            needToDisableAMS = false
          };
          if (needToDisableAMS) {//this catches any mgefs that didn't get done in makeIngrWorkOverTime
            //disableAssociatedMagicSchools(rec);
          };*/
          makeIngrWorkOverTime(rec);
        };
      }
    };
  };

  const records_Ingestible = {
    records: (filesToPatch, helpers, settings, locals) => {
      helpers.logMessage(`Patching alchemy ingestibles`);
      let ingests = helpers.loadRecords('ALCH')
      .filter(rec => {
        let potionEffects = getRecordArray_Effects(rec)
        return xelib.HasElement(rec, `Effects`)
        && isPotionAllowed(rec) 
        && Object.keys(potionEffects).every(effect => {
          if (getAlchemyEffect(potionEffects[effect].mgefHandle)!== null){return true};
        });
      });
      ingests.forEach(rec => {

      });
    }
  }
  function records_Alchemy(patchFile, settings, helpers, locals){
    return {
      records: (filesToPatch, helpers, settings, locals) => {
        helpers.logMessage(`Patching alchemy effects`);
        let potions = helpers.loadRecords('ALCH')
        .filter(rec => xelib.HasElement(rec, `Effects`))
        potions.forEach(rec => {
          disableAssociatedMagicSchools(rec);
        });
        helpers.logMessage(`Done patching alchemy effects`);

        helpers.logMessage(`Patching ingredient effects`);
        let ingredients = helpers.loadRecords('ARMO')
        .filter(rec => xelib.HasElement(rec, `Effects`))
        ingredients.forEach(rec => {
          disableAssociatedMagicSchools(rec);
        });
        helpers.logMessage(`Done patching ingredient effects`);
        return [];
      }
    };
  };
  return {
    loadAndPatch_Ingestible,
		loadAndPatch_Ingredients,
    records_Ingestible,
		records_Alchemy
  };
}